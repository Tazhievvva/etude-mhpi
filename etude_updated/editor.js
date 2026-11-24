/* ЭТЮД — блочный редактор статей */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const canvas = $("#articleBlocks");
  const list = $("#blockList");
  const settings = $("#blockSettings");
  const status = $("#saveStatus");
  const STORAGE_KEY = "etude_article_blocks_draft_v1";
  let blocks = [];
  let selectedId = null;
  let history = [];
  let historyIndex = -1;
  let dragId = null;

  const types = {
    title: ["Заголовок", "Новая статья"],
    lead: ["Вводный текст", "Краткое вступление к статье..."],
    paragraph: ["Текст", "Начните писать текст статьи..."],
    heading: ["Подзаголовок", "Новый раздел"],
    image: ["Изображение", ""],
    gallery: ["Галерея", ""],
    quote: ["Цитата", "Текст цитаты..."],
    divider: ["Разделитель", ""],
    ps: ["P.S.", "Послесловие..."]
  };

  const uid = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));

  function snapshot() {
    const state = JSON.stringify(blocks);
    if (history[historyIndex] === state) return;
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > 60) history.shift();
    historyIndex = history.length - 1;
    status.textContent = "Есть несохранённые изменения";
  }
  function restore(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    blocks = JSON.parse(history[index]);
    selectedId = null;
    render();
    showEmptySettings();
    status.textContent = "История восстановлена";
  }
  function addBlock(type) {
    const [label, text] = types[type];
    const block = {id:uid(), type, label, text, src:"", caption:"", images:[]};
    blocks.push(block);
    selectedId = block.id;
    snapshot();
    render();
    showSettings(block);
  }
  function renderBlock(block) {
    const content = esc(block.text).replace(/\n/g, "<br>");
    switch(block.type) {
      case "title": return `<h1>${content || "Новая статья"}</h1>`;
      case "lead": return `<p>${content}</p>`;
      case "paragraph": return `<p>${content}</p>`;
      case "heading": return `<h2>${content}</h2>`;
      case "quote": return `<blockquote>${content}</blockquote>`;
      case "divider": return `<hr>`;
      case "ps": return `<p>${content}</p>`;
      case "image": return block.src
        ? `<img src="${block.src}" alt="${esc(block.caption || "Иллюстрация")}"><p class="image-caption">${esc(block.caption)}</p>`
        : `<div class="block-placeholder">Изображение не добавлено</div>`;
      case "gallery": return block.images.length
        ? `<div class="gallery-images">${block.images.map(src=>`<img src="${src}" alt="Фотография из галереи">`).join("")}</div>`
        : `<div class="block-placeholder">Добавьте фотографии в настройках блока</div>`;
      default: return "";
    }
  }
  function render() {
    if (!blocks.length) canvas.innerHTML = `<div class="empty-article">Статья пока пустая.<br>Добавь блок в левой панели.</div>`;
    else canvas.innerHTML = blocks.map((b,i)=>`<section class="article-block ${b.type} ${b.id===selectedId?"selected":""}" data-id="${b.id}" draggable="true">${renderBlock(b)}</section>`).join("");
    list.innerHTML = blocks.length ? blocks.map((b,i)=>`<div class="block-row ${b.id===selectedId?"active":""}" data-id="${b.id}" draggable="true"><span class="block-index">${String(i+1).padStart(2,"0")}</span><span class="block-label">${esc(b.label)}</span><span class="drag-mark">⠿</span></div>`).join("") : `<p class="sidebar-hint">Добавь первый блок статьи.</p>`;
  }
  function showEmptySettings() {
    settings.innerHTML = `<div class="empty-selection"><div class="empty-icon">◇</div><p>Выбери блок статьи, чтобы изменить его содержимое.</p></div>`;
  }
  function showSettings(block) {
    const isMedia = ["image","gallery"].includes(block.type);
    settings.innerHTML = `
      <div class="property-group"><label>Тип блока</label><input value="${esc(block.label)}" disabled></div>
      ${block.type!=="divider" ? `<div class="property-group"><label>${block.type==="title"||block.type==="heading"?"Текст заголовка":"Содержимое"}</label><textarea id="blockText">${esc(block.text)}</textarea></div>`:""}
      ${block.type==="image" ? `<div class="property-group"><label>Изображение</label><input id="imageFile" type="file" accept="image/*"><label>Подпись к изображению</label><input id="blockCaption" value="${esc(block.caption)}" placeholder="Необязательно"></div>`:""}
      ${block.type==="gallery" ? `<div class="property-group"><label>Фотографии галереи</label><input id="galleryFiles" type="file" accept="image/*" multiple></div><p class="property-help">Можно выбрать сразу несколько изображений. Они сохраняются в черновике этого браузера.</p><button id="clearGallery" class="move-actions button" type="button">Очистить галерею</button>`:""}
      <div class="move-actions"><button id="moveUp" type="button">↑ Выше</button><button id="moveDown" type="button">↓ Ниже</button></div>
      <button id="deleteBlock" class="danger-button" type="button">Удалить блок</button>
    `;
    const textInput = $("#blockText");
    if (textInput) textInput.addEventListener("input", e => {block.text=e.target.value; renderBlockOnly(block);});
    if ($("#blockCaption")) $("#blockCaption").addEventListener("input",e=>{block.caption=e.target.value;renderBlockOnly(block);});
    if ($("#imageFile")) $("#imageFile").addEventListener("change",e=>readFiles(e.target.files, files=>{block.src=files[0]||"";snapshot();render();showSettings(block);}));
    if ($("#galleryFiles")) $("#galleryFiles").addEventListener("change",e=>readFiles(e.target.files, files=>{block.images.push(...files);snapshot();render();showSettings(block);}));
    if ($("#clearGallery")) $("#clearGallery").addEventListener("click",()=>{block.images=[];snapshot();render();showSettings(block);});
    $("#deleteBlock").addEventListener("click",()=>{if(!confirm("Удалить этот блок?"))return;blocks=blocks.filter(x=>x.id!==block.id);selectedId=null;snapshot();render();showEmptySettings();});
    $("#moveUp").addEventListener("click",()=>move(block.id,-1));
    $("#moveDown").addEventListener("click",()=>move(block.id,1));
  }
  function renderBlockOnly(block) {
    const el = canvas.querySelector(`[data-id="${block.id}"]`);
    if (el) el.innerHTML = renderBlock(block);
    const row = list.querySelector(`[data-id="${block.id}"] .block-label`);
    if (row) row.textContent = block.label;
  }
  function readFiles(fileList, callback) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const readers = files.map(file=>new Promise(resolve=>{
      const reader = new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(callback);
  }
  function move(id, direction) {
    const index=blocks.findIndex(b=>b.id===id), next=index+direction;
    if(index<0||next<0||next>=blocks.length)return;
    [blocks[index],blocks[next]]=[blocks[next],blocks[index]];
    selectedId=id;snapshot();render();showSettings(blocks.find(b=>b.id===id));
  }
  function select(id) {
    selectedId=id;render();
    const block=blocks.find(b=>b.id===id);
    if(block)showSettings(block);else showEmptySettings();
  }
  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(blocks));
      status.textContent="Черновик сохранён в этом браузере";
    } catch(e) {
      alert("Не удалось сохранить черновик. Возможно, изображения слишком большие. Попробуй уменьшить их размер.");
    }
  }
  function preview() {
    const body = blocks.map(b=>`<section class="block ${b.type}">${renderBlock(b)}</section>`).join("");
    const doc = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Предпросмотр — ЭТЮД</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f3f0;color:#171717;font-family:Arial,sans-serif}.page{max-width:850px;margin:35px auto;background:white;padding:60px 8%;min-height:90vh}.meta{font-size:10px;letter-spacing:1.4px;color:#777;border-bottom:1px solid #ddd;padding-bottom:18px;margin-bottom:30px}.block{margin:0 0 26px}.title h1{font-size:clamp(36px,6vw,60px);letter-spacing:-2px;line-height:1.02;margin:0}.heading h2{font-size:30px}.block p{font-size:16px;line-height:1.8;color:#444}.lead p{font-size:20px}.quote blockquote{margin:0;border-left:3px solid #d51e22;padding-left:22px;font-size:23px;line-height:1.5}.block img{max-width:100%;height:auto}.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.gallery img{width:100%}.ps p{font-style:italic;color:#777;font-size:14px}.image-caption{font-size:11px!important;color:#888!important}hr{border:0;border-top:1px solid #ddd}@media(max-width:600px){.page{margin:0;padding:35px 6%}.gallery{grid-template-columns:1fr}}</style></head><body><main class="page"><div class="meta">ЭТЮД · ЖУРНАЛ ТВОРЧЕСКОЙ ЖИЗНИ МХПИ</div>${body}<div class="meta">ЭТЮД. · ИСКУССТВО · ДИЗАЙН · ЛЮДИ</div></main></body></html>`;
    const win=window.open("","_blank");
    if(!win){alert("Разреши всплывающие окна для предпросмотра.");return;}
    win.document.open();win.document.write(doc);win.document.close();
  }

  document.querySelectorAll("[data-add]").forEach(btn=>btn.addEventListener("click",()=>addBlock(btn.dataset.add)));
  canvas.addEventListener("click",e=>{const el=e.target.closest(".article-block");if(el)select(el.dataset.id);});
  list.addEventListener("click",e=>{const row=e.target.closest(".block-row");if(row)select(row.dataset.id);});
  [canvas,list].forEach(container=>{
    container.addEventListener("dragstart",e=>{
      const row=e.target.closest("[data-id]");if(!row)return;
      dragId=row.dataset.id;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragId);
      row.classList.add("dragging");
    });
    container.addEventListener("dragover",e=>{if(dragId)e.preventDefault();});
    container.addEventListener("drop",e=>{
      if(!dragId)return;e.preventDefault();
      const target=e.target.closest("[data-id]");const from=blocks.findIndex(b=>b.id===dragId);const to=target?blocks.findIndex(b=>b.id===target.dataset.id):blocks.length-1;
      if(from>=0&&to>=0&&from!==to){const [item]=blocks.splice(from,1);blocks.splice(to,0,item);selectedId=item.id;snapshot();render();showSettings(item);}
      dragId=null;
    });
    container.addEventListener("dragend",()=>{dragId=null;container.querySelectorAll(".dragging").forEach(el=>el.classList.remove("dragging"));});
  });
  document.querySelectorAll("[data-device]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-device]").forEach(x=>x.classList.toggle("active",x===btn));
    $("#articleCanvas").classList.remove("device-tablet","device-mobile");
    if(btn.dataset.device==="tablet")$("#articleCanvas").classList.add("device-tablet");
    if(btn.dataset.device==="mobile")$("#articleCanvas").classList.add("device-mobile");
  }));
  $("#undoBtn").addEventListener("click",()=>restore(historyIndex-1));
  $("#redoBtn").addEventListener("click",()=>restore(historyIndex+1));
  $("#previewBtn").addEventListener("click",preview);
  $("#saveBtn").addEventListener("click",saveDraft);
  document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveDraft();}});
  try { const saved=localStorage.getItem(STORAGE_KEY);if(saved)blocks=JSON.parse(saved); } catch(e) {}
  render();showEmptySettings();snapshot();
})();