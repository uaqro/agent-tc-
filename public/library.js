import { apiFetch } from "./api.js";

/** Panel "Base de conocimiento": explorar carpetas, editar .md y subir documentos. */

const el = {
  modal: document.getElementById("library-modal"),
  tree: document.getElementById("tree"),
  editor: document.getElementById("editor"),
  editorPath: document.getElementById("editor-path"),
  save: document.getElementById("save-file"),
  remove: document.getElementById("delete-file"),
  newMd: document.getElementById("new-md"),
  uploadButton: document.getElementById("upload-button"),
  fileInput: document.getElementById("file-input"),
  dropzone: document.getElementById("dropzone"),
  dropOverlay: document.getElementById("drop-overlay"),
  status: document.getElementById("library-status"),
  reindex: document.getElementById("library-reindex"),
};

const ICONS = { ".md": "📄", ".markdown": "📄", ".txt": "📄", ".pdf": "📕", ".docx": "📘" };

let current = null;
let dirty = false;
let onChange = () => {};

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("error", isError);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function request(url, options = {}) {
  const response = await apiFetch(url, options);
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? `Error ${response.status}`);
  return data;
}

/* ---------- Árbol de archivos ---------- */

async function refreshTree(selectPath = current?.path ?? null) {
  const data = await request("/api/knowledge");
  el.tree.replaceChildren();

  for (const folder of data.folders) {
    const section = document.createElement("section");
    section.className = "tree-folder";

    const head = document.createElement("div");
    head.className = "tree-folder-head";
    const title = document.createElement("strong");
    title.textContent = `📁 ${folder.path}`;
    const count = document.createElement("span");
    count.textContent = `${folder.files.length} archivo(s)`;
    head.append(title, count);

    const hint = document.createElement("p");
    hint.className = "tree-folder-hint";
    hint.textContent = folder.description;

    section.append(head, hint);

    if (folder.files.length === 0) {
      const empty = document.createElement("p");
      empty.className = "tree-empty";
      empty.textContent = "Carpeta vacía.";
      section.appendChild(empty);
    }

    for (const file of folder.files) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `tree-file${file.path === selectPath ? " active" : ""}`;
      item.disabled = !file.editable;
      item.title = file.editable ? "Abrir para editar" : "Formato binario: solo se indexa";

      const name = document.createElement("span");
      name.className = "tree-file-name";
      name.textContent = `${ICONS[file.extension] ?? "📎"} ${file.name}`;

      const meta = document.createElement("span");
      meta.className = "tree-file-meta";
      meta.textContent = formatSize(file.size);

      item.append(name, meta);
      item.addEventListener("click", () => openFile(file.path));
      section.appendChild(item);
    }

    el.tree.appendChild(section);
  }
}

/* ---------- Editor ---------- */

function setDirty(value) {
  dirty = value;
  el.save.disabled = !value || !current;
  el.editorPath.classList.toggle("dirty", value);
}

async function openFile(path) {
  if (dirty && !confirm("Hay cambios sin guardar. ¿Descartarlos?")) return;
  try {
    const file = await request(`/api/knowledge/file?path=${encodeURIComponent(path)}`);
    current = file;
    el.editor.value = file.content;
    el.editor.disabled = false;
    el.editorPath.textContent = file.path;
    el.remove.disabled = file.protected;
    setDirty(false);
    setStatus("");
    await refreshTree(path);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function clearEditor() {
  current = null;
  el.editor.value = "";
  el.editor.disabled = true;
  el.editorPath.textContent = "Ningún archivo seleccionado";
  el.remove.disabled = true;
  setDirty(false);
}

async function saveCurrent() {
  if (!current) return;
  try {
    await request("/api/knowledge/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: current.path, content: el.editor.value }),
    });
    setDirty(false);
    setStatus(`Guardado y publicado: ${current.path}.`);
    await refreshTree(current.path);
  } catch (error) {
    setStatus(error.message, true);
  }
}

/* ---------- Subida ---------- */

async function uploadFiles(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) return;

  const form = new FormData();
  for (const file of files) form.append("files", file, file.name);

  setStatus(`Subiendo ${files.length} archivo(s)...`);
  try {
    const result = await request("/api/knowledge/upload", { method: "POST", body: form });
    await refreshTree();
    const saved = result.saved.length;
    const errors = result.errors.length ? ` · ${result.errors.join(" ")}` : "";
    setStatus(`${saved} archivo(s) subido(s). Reindexa para aplicarlos.${errors}`, Boolean(errors));
  } catch (error) {
    setStatus(error.message, true);
  }
}

/* ---------- Eventos ---------- */

el.editor.addEventListener("input", () => setDirty(true));
el.save.addEventListener("click", saveCurrent);

el.remove.addEventListener("click", async () => {
  if (!current || !confirm(`¿Eliminar ${current.path}?`)) return;
  try {
    await request(`/api/knowledge/file?path=${encodeURIComponent(current.path)}`, {
      method: "DELETE",
    });
    setStatus(`Eliminado: ${current.path}.`);
    clearEditor();
    await refreshTree(null);
  } catch (error) {
    setStatus(error.message, true);
  }
});

el.newMd.addEventListener("click", async () => {
  const name = prompt("Nombre del nuevo archivo markdown:", "nueva-seccion.md");
  if (!name) return;
  try {
    const file = await request("/api/knowledge/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "knowledge", name }),
    });
    await refreshTree(file.path);
    await openFile(file.path);
  } catch (error) {
    setStatus(error.message, true);
  }
});

el.uploadButton.addEventListener("click", () => el.fileInput.click());
el.fileInput.addEventListener("change", async (event) => {
  await uploadFiles(event.target.files);
  event.target.value = "";
});

for (const type of ["dragenter", "dragover"]) {
  el.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    el.dropOverlay.classList.add("visible");
  });
}
for (const type of ["dragleave", "drop"]) {
  el.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    if (type === "dragleave" && el.dropzone.contains(event.relatedTarget)) return;
    el.dropOverlay.classList.remove("visible");
  });
}
el.dropzone.addEventListener("drop", (event) => uploadFiles(event.dataTransfer?.files));

el.reindex.addEventListener("click", async () => {
  if (dirty) await saveCurrent();
  el.reindex.disabled = true;
  setStatus("Publicando...");
  try {
    const data = await request("/api/ingest", { method: "POST" });
    setStatus(`${data.documents} guía(s) publicadas.`);
    onChange();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    el.reindex.disabled = false;
  }
});

for (const node of el.modal.querySelectorAll("[data-close-library]")) {
  node.addEventListener("click", closeLibrary);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.modal.hidden) closeLibrary();
});

/* ---------- API pública ---------- */

export function closeLibrary() {
  if (dirty && !confirm("Hay cambios sin guardar. ¿Cerrar de todos modos?")) return;
  el.modal.hidden = true;
}

export async function openLibrary(onIndexChanged = () => {}) {
  onChange = onIndexChanged;
  el.modal.hidden = false;
  clearEditor();
  setStatus("");
  try {
    await refreshTree(null);
  } catch (error) {
    setStatus(error.message, true);
  }
}
