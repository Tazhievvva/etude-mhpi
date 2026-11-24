
/* =====================================
   ЭТЮД — VISUAL EDITOR
   Основная логика редактора
===================================== */

const canvas = document.getElementById("websiteCanvas");
const properties = document.getElementById("properties");
const layers = document.getElementById("layers");
const saveStatus = document.getElementById("saveStatus");

let selectedElement = null;
let history = [];
let historyIndex = -1;
let isRestoring = false;

/* СОХРАНЕНИЕ СОСТОЯНИЯ */

function saveHistory() {
  if (isRestoring) return;

  const state = canvas.innerHTML;

  if (history[historyIndex] === state) return;

  history = history.slice(0, historyIndex + 1);
  history.push(state);
  historyIndex = history.length - 1;

  saveStatus.textContent = "Есть несохранённые изменения";
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;

  isRestoring = true;
  canvas.innerHTML = history[index];
  historyIndex = index;
  selectedElement = null;

  isRestoring = false;

  updateLayers();
  showEmptyProperties();
  saveStatus.textContent = "История восстановлена";
}

function saveDraft() {
  localStorage.setItem("etude_editor_draft", canvas.innerHTML);
  saveStatus.textContent = "Черновик сохранён";
}

function loadDraft() {
  const draft = localStorage.getItem("etude_editor_draft");

  if (draft) {
    canvas.innerHTML = draft;
    saveStatus.textContent = "Загружен черновик";
  }

  updateLayers();
}

/* ВЫБОР ЭЛЕМЕНТА */

function selectElement(element) {
  if (!element || element === canvas) return;

  if (selectedElement) {
    selectedElement.classList.remove("editor-selected");
    selectedElement.removeAttribute("contenteditable");
  }

  selectedElement = element;
  selectedElement.classList.add("editor-selected");

  showProperties(selectedElement);
  updateLayers();
}

function showEmptyProperties() {
  properties.innerHTML = `
    <div class="empty-selection">
      <div class="empty-icon">◇</div>
      <p>Выбери элемент на холсте, чтобы изменить его свойства.</p>
    </div>
  `;
}

/* ПАНЕЛЬ СВОЙСТВ */

function showProperties(element) {
  const isText = element.matches("h1, h2, h3, p, span, a, button, div");
  const textValue = element.innerText || "";
  const color = rgbToHex(getComputedStyle(element).color);
  const background = rgbToHex(getComputedStyle(element).backgroundColor);
  const fontSize = parseInt(getComputedStyle(element).fontSize) || 16;

  properties.innerHTML = `
    <div class="property-group">
      <label>Название элемента</label>
      <input id="elementName" value="${escapeHTML(element.dataset.name || element.tagName.toLowerCase())}">
    </div>

    ${isText ? `
      <div class="property-group">
        <label>Текст</label>
        <textarea id="elementText" rows="4">${escapeHTML(textValue)}</textarea>
      </div>
    ` : ""}

    <div class="property-group">
      <label>Размер текста</label>
      <input id="elementFontSize" type="number" min="8" max="160" value="${fontSize}">
    </div>

    <div class="property-group">
      <label>Цвет текста</label>
      <input id="elementColor" type="color" value="${color}">
    </div>

    <div class="property-group">
      <label>Цвет фона</label>
      <input id="elementBackground" type="color" value="${background}">
    </div>

    <div class="property-group">
      <label>Внутренние отступы</label>
      <input id="elementPadding" type="number" min="0" max="200" value="${parseInt(getComputedStyle(element).padding) || 0}">
    </div>

    <div class="property-group">
      <label>Ширина</label>
      <select id="elementWidth">
        <option value="auto">Автоматически</option>
        <option value="100%">100%</option>
        <option value="50%">50%</option>
        <option value="75%">75%</option>
      </select>
    </div>

    <button class="delete-element" id="deleteElement">Удалить элемент</button>
  `;

  document.getElementById("elementName").addEventListener("change", event => {
    element.dataset.name = event.target.value;
    updateLayers();
    saveHistory();
  });

  const textInput = document.getElementById("elementText");

  if (textInput) {
    textInput.addEventListener("input", event => {
      element.innerText = event.target.value;
      updateLayers();
    });

    textInput.addEventListener("change", saveHistory);
  }

  document.getElementById("elementFontSize").addEventListener("change", event => {
    element.style.fontSize = event.target.value + "px";
    saveHistory();
  });

  document.getElementById("elementColor").addEventListener("input", event => {
    element.style.color = event.target.value;
  });

  document.getElementById("elementColor").addEventListener("change", saveHistory);

  document.getElementById("elementBackground").addEventListener("input", event => {
    element.style.backgroundColor = event.target.value;
  });

  document.getElementById("elementBackground").addEventListener("change", saveHistory);

  document.getElementById("elementPadding").addEventListener("change", event => {
    element.style.padding = event.target.value + "px";
    saveHistory();
  });

  document.getElementById("elementWidth").addEventListener("change", event => {
    element.style.width = event.target.value;
    saveHistory();
  });

  document.getElementById("deleteElement").addEventListener("click", () => {
    if (!confirm("Удалить выбранный элемент?")) return;

    element.remove();
    selectedElement = null;
    showEmptyProperties();
    updateLayers();
    saveHistory();
  });
}

/* СЛОИ */

function updateLayers() {
  const elements = canvas.querySelectorAll(".editable-element");

  layers.innerHTML = "";

  const root = document.createElement("div");
  root.className = "layer-item";
  root.textContent = "⌂ Главная страница";
  layers.appendChild(root);

  elements.forEach((element, index) => {
    const layer = document.createElement("div");
    layer.className = "layer-item";

    if (element === selectedElement) {
      layer.classList.add("active");
    }

    layer.textContent = "▣ " + (element.dataset.name || "Блок " + (index + 1));

    layer.addEventListener("click", () => selectElement(element));

    layers.appendChild(layer);
  });
}

/* ДОБАВЛЕНИЕ ЭЛЕМЕНТОВ */

function addElement(type) {
  const section = document.createElement("section");
  section.className = "editable-element";
  section.dataset.name = "Новый элемент";
  section.style.padding = "25px";
  section.style.margin = "10px 0";
  section.style.border = "1px dashed #cccccc";

  if (type === "text") {
    section.innerHTML = "<h2>Новый заголовок</h2><p>Добавьте свой текст</p>";
  }

  if (type === "image") {
    section.innerHTML = `
      <div style="background:#e9e7e2;padding:60px;text-align:center">
        <p>Место для изображения</p>
        <button type="button" class="choose-image">Загрузить изображение</button>
        <input type="file" accept="image/*" hidden>
      </div>
    `;

    const input = section.querySelector("input");
    const button = section.querySelector(".choose-image");

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        const image = document.createElement("img");
        image.src = reader.result;
        image.alt = "Изображение";
        image.style.width = "100%";
        image.style.display = "block";

        section.innerHTML = "";
        section.appendChild(image);
        section.dataset.name = "Изображение";
        selectElement(section);
        saveHistory();
      };

      reader.readAsDataURL(file);
    });
  }

  if (type === "button") {
    section.innerHTML = `
      <a href="#" style="display:inline-block;background:#171717;color:white;padding:14px 25px;border-radius:30px;text-decoration:none">
        Новая кнопка
      </a>
    `;
  }

  if (type === "container") {
    section.innerHTML = "<h2>Новая секция</h2><p>Содержимое секции</p>";
    section.style.minHeight = "150px";
  }

  if (type === "gallery") {
    section.innerHTML = `
      <h2>Новая галерея</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <div style="background:#e9e7e2;padding:35px 5px;text-align:center">Фото 1</div>
        <div style="background:#e9e7e2;padding:35px 5px;text-align:center">Фото 2</div>
        <div style="background:#e9e7e2;padding:35px 5px;text-align:center">Фото 3</div>
      </div>
    `;
  }

  canvas.appendChild(section);
  selectElement(section);
  updateLayers();
  saveHistory();
}

/* ПОДГОТОВКА СЛУЖЕБНЫХ ФУНКЦИЙ */

function rgbToHex(rgb) {
  if (!rgb || rgb === "transparent") return "#ffffff";

  const values = rgb.match(/\d+/g);

  if (!values || values.length < 3) return "#ffffff";

  return "#" + values.slice(0, 3)
    .map(value => Number(value).toString(16).padStart(2, "0"))
    .join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* ОБРАБОТКА ХОЛСТА */

canvas.addEventListener("click", event => {
  const element = event.target.closest(".editable-element");

  if (element && canvas.contains(element)) {
    selectElement(element);
  }
});

canvas.addEventListener("dblclick", event => {
  const element = event.target.closest(".editable-element");

  if (!element || !canvas.contains(element)) return;

  const textElement = element.querySelector("h1, h2, h3, p, span");

  if (textElement) {
    textElement.contentEditable = "true";
    textElement.focus();

    textElement.addEventListener("blur", () => {
      textElement.removeAttribute("contenteditable");
      saveHistory();
    }, { once: true });
  }
});

/* КНОПКИ ДОБАВЛЕНИЯ */

document.querySelectorAll("[data-add]").forEach(button => {
  button.addEventListener("click", () => {
    addElement(button.dataset.add);
  });
});

/* ПЕРЕКЛЮЧЕНИЕ УСТРОЙСТВ */

document.querySelectorAll("[data-device]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-device]").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const device = button.dataset.device;

    canvas.classList.remove("device-tablet", "device-mobile");

    if (device === "tablet") {
      canvas.classList.add("device-tablet");
    }

    if (device === "mobile") {
      canvas.classList.add("device-mobile");
    }
  });
});

/* ОТМЕНА И ПОВТОР */

document.getElementById("undoBtn").addEventListener("click", () => {
  restoreHistory(historyIndex - 1);
});

document.getElementById("redoBtn").addEventListener("click", () => {
  restoreHistory(historyIndex + 1);
});

/* ПРЕДПРОСМОТР */

document.getElementById("previewBtn").addEventListener("click", () => {
  const preview = window.open("", "_blank");

  if (!preview) {
    alert("Разреши открытие всплывающих окон для предпросмотра.");
    return;
  }

  preview.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Предпросмотр — ЭТЮД</title>
      <style>
        body { margin:0; font-family:Arial,sans-serif; }
        * { box-sizing:border-box; }
        .editor-selected { outline:none !important; }
      </style>
    </head>
    <body>${canvas.innerHTML}</body>
    </html>
  `);

  preview.document.close();
});

/* СОХРАНЕНИЕ ЧЕРНОВИКА */

document.getElementById("publishBtn").addEventListener("click", () => {
  saveDraft();
  alert("Черновик сохранён в этом браузере. Публикация на сайте будет подключена на следующем этапе.");
});

/* СТАРТ */

loadDraft();

if (history.length === 0) {
  saveHistory();
}

showEmptyProperties();

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveDraft();
  }
});

/* ПЕРЕТАСКИВАНИЕ И СОРТИРОВКА БЛОКОВ */

let draggedElement = null;

function makeElementsDraggable() {
  canvas.querySelectorAll(".editable-element").forEach(element => {
    element.draggable = true;
  });
}

function finishReorder() {
  updateLayers();
  saveHistory();
}

function moveElement(source, target, y) {
  if (!source || source === target) return false;

  if (!target) {
    canvas.appendChild(source);
    return true;
  }

  const rect = target.getBoundingClientRect();
  const insertBefore = y < rect.top + rect.height / 2;

  canvas.insertBefore(
    source,
    insertBefore ? target : target.nextElementSibling
  );

  return true;
}

/* Перетаскивание на холсте */

canvas.addEventListener("dragstart", event => {
  const element = event.target.closest(".editable-element");
  if (!element) return;

  draggedElement = element;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", "etude-block");
  element.classList.add("is-dragging");
});

canvas.addEventListener("dragover", event => {
  if (!draggedElement) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

canvas.addEventListener("drop", event => {
  if (!draggedElement) return;

  event.preventDefault();

  const target = event.target.closest(".editable-element");
  const changed = moveElement(draggedElement, target, event.clientY);

  if (changed) finishReorder();
});

canvas.addEventListener("dragend", () => {
  if (draggedElement) {
    draggedElement.classList.remove("is-dragging");
  }
  draggedElement = null;
});

/* Перетаскивание в списке структуры */

layers.addEventListener("dragstart", event => {
  const row = event.target.closest(".layer-item");
  if (!row) return;

  const rows = Array.from(layers.children).filter(
    (item, index) => index > 0
  );

  const index = rows.indexOf(row);
  if (index < 0) return;

  draggedElement = canvas.children[index];
  if (!draggedElement) return;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", "etude-block");
  row.classList.add("is-dragging");
});

layers.addEventListener("dragover", event => {
  if (!draggedElement) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

layers.addEventListener("drop", event => {
  if (!draggedElement) return;

  event.preventDefault();

  const row = event.target.closest(".layer-item");
  const rows = Array.from(layers.children).filter(
    (item, index) => index > 0
  );

  const index = row ? rows.indexOf(row) : -1;
  const target = index >= 0 ? canvas.children[index] : null;

  const changed = moveElement(draggedElement, target, event.clientY);

  if (changed) finishReorder();
});

layers.addEventListener("dragend", () => {
  layers.querySelectorAll(".is-dragging").forEach(item => {
    item.classList.remove("is-dragging");
  });

  if (draggedElement) {
    draggedElement.classList.remove("is-dragging");
  }

  draggedElement = null;
});

/* Подготовка блоков */

makeElementsDraggable();

new MutationObserver(() => {
  makeElementsDraggable();
}).observe(canvas, {
  childList: true
});
