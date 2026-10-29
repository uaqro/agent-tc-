import { apiFetch, downloadFile } from "./api.js";

/** Panel "Guías PDF": lista, descarga y carga de los materiales de `knowledge_pdf/`. */

const el = {
  modal: document.getElementById("materials-modal"),
  list: document.getElementById("materials-list"),
  filter: document.getElementById("materials-filter"),
  uploadButton: document.getElementById("materials-upload"),
  fileInput: document.getElementById("materials-input"),
  status: document.getElementById("materials-status"),
};

let materials = [];

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle("error", isError);
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Botón de descarga reutilizado en el chat y en el panel (descarga autenticada). */
export function downloadLink(item, label = item.title) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "download-chip";
  button.title = item.name;
  const icon = document.createElement("span");
  icon.className = "flow-symbol";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "download";
  button.append(icon, document.createTextNode(label));
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await downloadFile(item.url, item.name);
    } catch (error) {
      alertInline(button, error.message);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function alertInline(button, message) {
  button.title = message;
  button.classList.add("error");
  setTimeout(() => button.classList.remove("error"), 4000);
}

let canUpload = false;

export function setMaterialsAdmin(isAdmin) {
  canUpload = isAdmin;
  el.uploadButton.hidden = !isAdmin;
}

function render() {
  const query = el.filter.value.trim().toLowerCase();
  const visible = materials.filter(
    (item) => !query || `${item.title} ${item.name}`.toLowerCase().includes(query),
  );
  el.list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "materials-empty";
    empty.textContent = materials.length ? "Sin resultados." : "No hay guías en knowledge_pdf/.";
    el.list.appendChild(empty);
    return;
  }
  for (const item of visible) {
    const row = document.createElement("div");
    row.className = "material-row";
    const info = document.createElement("div");
    info.className = "material-info";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = `${item.name} · ${formatSize(item.size)}`;
    info.append(title, meta);
    const fileIcon = document.createElement("span");
    fileIcon.className = "flow-symbol material-icon";
    fileIcon.setAttribute("aria-hidden", "true");
    fileIcon.textContent = "picture_as_pdf";
    row.append(fileIcon, info, downloadLink(item, "Descargar"));
    el.list.appendChild(row);
  }
}

async function load() {
  setStatus("Cargando...");
  try {
    const response = await apiFetch("/api/materials");
    const data = await response.json();
    materials = data.materials ?? [];
    setStatus(`${materials.length} guía(s) disponibles`);
  } catch {
    materials = [];
    setStatus("No se pudo cargar la lista.", true);
  }
  render();
}

async function upload(files) {
  if (!files.length || !canUpload) return;
  const form = new FormData();
  for (const file of files) form.append("files", file);
  setStatus("Subiendo...");
  try {
    const response = await apiFetch("/api/materials", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail ?? `Error ${response.status}`);
    await load();
    const errors = data.errors?.length ? ` · ${data.errors.join(" ")}` : "";
    setStatus(`${data.saved.length} archivo(s) subido(s)${errors}`, Boolean(errors));
  } catch (error) {
    setStatus(error.message, true);
  }
}

export function closeMaterials() {
  el.modal.hidden = true;
}

export function openMaterials() {
  el.modal.hidden = false;
  el.filter.value = "";
  load();
  el.filter.focus();
}

el.filter.addEventListener("input", render);
el.uploadButton.addEventListener("click", () => el.fileInput.click());
el.fileInput.addEventListener("change", () => {
  upload([...el.fileInput.files]);
  el.fileInput.value = "";
});
el.modal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-materials]")) closeMaterials();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.modal.hidden) closeMaterials();
});
