export default async (request, context) => {
  const password = Netlify.env.get("EDITOR_PASSWORD");

  if (!password) {
    return new Response("Пароль редактора не настроен.", {
      status: 503
    });
  }

  const auth = request.headers.get("authorization") || "";

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const separator = decoded.indexOf(":");

      if (separator !== -1) {
        const username = decoded.slice(0, separator);
        const enteredPassword = decoded.slice(separator + 1);

        if (username === "etude" && enteredPassword === password) {
          return context.next();
        }
      }
    } catch (_) {}
  }

  return new Response("Введите логин и пароль для входа.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ETUDE editor"',
      "Cache-Control": "no-store"
    }
  });
};

export const config = {
  path: "/editor.html"
};
