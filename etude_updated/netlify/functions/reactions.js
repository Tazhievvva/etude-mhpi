const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  },
  body: JSON.stringify(body)
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url: url.replace(/\/$/, ""), key };
}

async function supabase(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? null : await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

async function snapshot(issueId, deviceId) {
  const { url, key } = config();
  const baseHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  // Ask PostgREST for an exact count; do not rely on its default 1,000-row page.
  const countResponse = await fetch(
    `${url}/rest/v1/etude_votes?select=device_id&issue_id=eq.${encodeURIComponent(issueId)}&vote=eq.up`,
    { headers: { ...baseHeaders, Prefer: "count=exact", Range: "0-0" } }
  );
  const errorBody = await countResponse.text();
if (!countResponse.ok) throw new Error(`Supabase count failed (${countResponse.status}): ${errorBody}`);
  const range = countResponse.headers.get("content-range") || "*/0";
  const likes = Number((range.split("/")[1] || "0").replace("*", "0")) || 0;
  const ownRows = await supabase(
    `etude_votes?select=vote&issue_id=eq.${encodeURIComponent(issueId)}&device_id=eq.${encodeURIComponent(deviceId)}`
  );
  return { likes, vote: ownRows[0] ? ownRows[0].vote : null };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  try {
    if (event.httpMethod === "GET") {
      const params = new URLSearchParams(event.queryStringParameters || {});
      const issueId = params.get("issueId") || "issue01";
      const deviceId = params.get("deviceId");
      if (!/^[a-z0-9_-]{1,64}$/i.test(issueId) || !deviceId || !UUID.test(deviceId)) {
        return json(400, { error: "Invalid issueId or deviceId" });
      }
      return json(200, await snapshot(issueId, deviceId));
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const issueId = body.issueId || "issue01";
      const deviceId = body.deviceId;
      const vote = body.vote;
      if (!/^[a-z0-9_-]{1,64}$/i.test(issueId) || !deviceId || !UUID.test(deviceId)) {
        return json(400, { error: "Invalid issueId or deviceId" });
      }
      if (vote !== null && vote !== "up" && vote !== "down") {
        return json(400, { error: "Vote must be up, down, or null" });
      }

      const filter = `issue_id=eq.${encodeURIComponent(issueId)}&device_id=eq.${encodeURIComponent(deviceId)}`;
      if (vote === null) {
        await supabase(`etude_votes?${filter}`, { method: "DELETE" });
      } else {
        await supabase("etude_votes?on_conflict=issue_id,device_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([{ issue_id: issueId, device_id: deviceId, vote }])
        });
      }
      return json(200, await snapshot(issueId, deviceId));
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    const message = error.message === "Supabase is not configured"
      ? "Сервер реакций ещё не подключён к Supabase."
      : "Не удалось обработать реакцию.";
    return json(500, { error: message });
  }
};
