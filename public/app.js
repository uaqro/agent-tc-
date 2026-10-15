import { apiFetch } from "./api.js";
import { renderMarkdown } from "./markdown.js";
import { openLibrary } from "./library.js";
import { downloadLink, openMaterials, setMaterialsAdmin } from "./materials.js";

const STORAGE_KEY = "damian.conversations";
// Nombre anterior de la app: se migra el historial guardado una sola vez.
const LEGACY_STORAGE_KEY = "migrationgpt.conversations";

const el = {
  thread: document.getElementById("thread"),
  welcome: document.getElementById("welcome"),
  suggestions: document.getElementById("suggestions"),
  composer: document.getElementById("composer"),
  input: document.getElementById("input"),
  send: document.getElementById("send"),
  conversations: document.getElementById("conversations"),
  newChat: document.getElementById("new-chat"),
  reindex: document.getElementById("reindex"),
  openLibrary: document.getElementById("open-library"),
  openMaterials: document.getElementById("open-materials"),
  status: document.getElementById("status"),
  sidebar: document.getElementById("sidebar"),
  toggleSidebar: document.getElementById("toggle-sidebar"),
  closeSidebar: document.getElementById("close-sidebar"),
};

let conversations = load();
let activeId = conversations[0]?.id ?? null;
let streaming = false;

function load() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Sin almacenamiento disponible: la conversación sigue en memoria.
  }
}

function newId() {
  return crypto.randomUUID();
}

function activeConversation() {
  return conversations.find((conversation) => conversation.id === activeId) ?? null;
}

function ensureConversation() {
  let conversation = activeConversation();
  if (!conversation) {
    conversation = { id: newId(), title: "Nueva conversación", messages: [] };
    conversations.unshift(conversation);
    activeId = conversation.id;
  }
  return conversation;
}

/* ---------- Sidebar ---------- */

function renderSidebar() {
  el.conversations.replaceChildren();
  for (const conversation of conversations) {
    const row = document.createElement("div");
    row.className = `conv${conversation.id === activeId ? " active" : ""}`;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "conv-title";
    open.textContent = conversation.title;
    open.addEventListener("click", () => {
      if (streaming) return;
      activeId = conversation.id;
      renderSidebar();
      renderThread();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "conv-delete";
    remove.textContent = "×";
    remove.title = "Eliminar conversación";
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (streaming) return;
      conversations = conversations.filter((item) => item.id !== conversation.id);
      if (activeId === conversation.id) activeId = conversations[0]?.id ?? null;
      persist();
      renderSidebar();
      renderThread();
      await apiFetch(`/api/sessions/${conversation.id}`, { method: "DELETE" }).catch(() => {});
    });

    row.append(open, remove);
    el.conversations.appendChild(row);
  }
}

/* ---------- Thread ---------- */

function messageNode(role) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${role}`;

  let avatar;
  if (role === "user") {
    avatar = document.createElement("div");
    avatar.textContent = "TÚ";
  } else {
    avatar = document.createElement("img");
    avatar.src = "assets/damian-avatar.webp";
    avatar.alt = "DamIAn";
  }
  avatar.classList.add("avatar");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  wrapper.append(avatar, bubble);
  el.thread.appendChild(wrapper);
  return bubble;
}

function renderDownloads(bubble, downloads) {
  if (!downloads?.length) return;
  const container = document.createElement("div");
  container.className = "sources downloads";
  const label = document.createElement("span");
  label.className = "sources-label";
  label.textContent = "Descargar PDF:";
  container.appendChild(label);
  for (const item of downloads) container.appendChild(downloadLink(item));
  bubble.appendChild(container);
}

function renderThread() {
  const conversation = activeConversation();
  el.thread.replaceChildren();

  if (!conversation || conversation.messages.length === 0) {
    el.thread.appendChild(el.welcome);
    return;
  }

  for (const message of conversation.messages) {
    const bubble = messageNode(message.role);
    bubble.appendChild(renderMarkdown(message.content));
    renderDownloads(bubble, message.downloads);
  }
  scrollToBottom();
}

function scrollToBottom() {
  el.thread.scrollTop = el.thread.scrollHeight;
}

/* ---------- Streaming ---------- */

async function* sseEvents(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const payload = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (payload) yield JSON.parse(payload);
    }
  }
}

async function send(text) {
  const conversation = ensureConversation();
  if (conversation.messages.length === 0) {
    conversation.title = text.length > 38 ? `${text.slice(0, 38)}...` : text;
  }
  conversation.messages.push({ role: "user", content: text });
  persist();
  renderSidebar();
  renderThread();

  const bubble = messageNode("assistant");
  const toolChip = document.createElement("div");
  toolChip.className = "tool-chip";
  const body = document.createElement("div");
  body.className = "cursor";
  bubble.append(body);
  scrollToBottom();

  setStreaming(true);
  let answer = "";
  let downloads = [];

  try {
    const response = await apiFetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // El servidor no guarda memoria: se envía el historial previo (sin el mensaje actual).
      body: JSON.stringify({
        message: text,
        history: conversation.messages.slice(0, -1).map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!response.ok || !response.body) {
      const detail = (await response.json().catch(() => ({}))).detail;
      throw new Error(
        response.status === 429
          ? "Demasiadas preguntas seguidas. Espera un minuto e intenta de nuevo."
          : (detail ?? `Error ${response.status} al contactar al agente.`),
      );
    }

    for await (const event of sseEvents(response)) {
      if (event.type === "tool") {
        toolChip.textContent = `🔎 consultando ${event.name}`;
        if (!toolChip.isConnected) bubble.prepend(toolChip);
      } else if (event.type === "token") {
        answer += event.text;
        body.replaceChildren(renderMarkdown(answer));
        body.classList.add("cursor");
        scrollToBottom();
      } else if (event.type === "downloads") {
        downloads = event.downloads ?? [];
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    body.classList.remove("cursor");
    toolChip.remove();
    if (!answer) {
      answer = "_El agente no devolvió contenido._";
      body.replaceChildren(renderMarkdown(answer));
    }
    renderDownloads(bubble, downloads);
    conversation.messages.push({ role: "assistant", content: answer, downloads });
    persist();
  } catch (error) {
    body.classList.remove("cursor");
    toolChip.remove();
    const message = document.createElement("p");
    message.className = "error-text";
    message.textContent = `⚠️ ${error.message}`;
    body.replaceChildren(message);
  } finally {
    setStreaming(false);
    scrollToBottom();
  }
}

function setStreaming(value) {
  streaming = value;
  el.send.disabled = value;
  el.input.disabled = value;
  if (!value) el.input.focus();
}

/* ---------- Health / ingest ---------- */

async function refreshStatus() {
  try {
    const response = await apiFetch("/api/me");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail ?? `Error ${response.status}`);
    applyRole(data);
    el.status.classList.toggle("error", !data.llm_configured);
    el.status.textContent = data.llm_configured
      ? `${data.indexed_chunks} guías cargadas`
      : "El backend no tiene el LLM configurado";
    return data;
  } catch (error) {
    el.status.classList.add("error");
    el.status.textContent = error.message.startsWith("Failed") ? "API sin conexión" : error.message;
    return null;
  }
}

/** Las funciones de administración solo se muestran a administradores (el backend también lo exige). */
function applyRole(me) {
  el.openLibrary.hidden = !me.is_admin;
  el.reindex.hidden = !me.is_admin;
  setMaterialsAdmin(me.is_admin);
}

/* ---------- Eventos ---------- */

el.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = el.input.value.trim();
  if (!text || streaming) return;
  el.input.value = "";
  autoGrow();
  send(text);
});

el.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    el.composer.requestSubmit();
  }
});

function autoGrow() {
  el.input.style.height = "auto";
  el.input.style.height = `${Math.min(el.input.scrollHeight, 200)}px`;
}

el.input.addEventListener("input", autoGrow);

el.suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || streaming) return;
  send(button.textContent.trim());
});

el.newChat.addEventListener("click", () => {
  if (streaming) return;
  const conversation = { id: newId(), title: "Nueva conversación", messages: [] };
  conversations.unshift(conversation);
  activeId = conversation.id;
  persist();
  renderSidebar();
  renderThread();
  el.input.focus();
});

el.openLibrary.addEventListener("click", () => openLibrary(refreshStatus));
el.openMaterials.addEventListener("click", openMaterials);

el.reindex.addEventListener("click", async () => {
  el.reindex.disabled = true;
  el.status.textContent = "Publicando...";
  try {
    const response = await apiFetch("/api/ingest", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail ?? "falló la indexación");
    el.status.classList.remove("error");
    el.status.textContent = `${data.documents} guías publicadas`;
  } catch (error) {
    el.status.classList.add("error");
    el.status.textContent = error.message;
  } finally {
    el.reindex.disabled = false;
  }
});

el.toggleSidebar.addEventListener("click", () => {
  el.sidebar.classList.toggle("collapsed");
});

/* En móvil el menú se abre encima del contenido: se cierra con la ✕ o al elegir algo. */
const isMobile = window.matchMedia("(max-width: 820px)");

function closeSidebarOnMobile() {
  if (isMobile.matches) el.sidebar.classList.add("collapsed");
}

el.closeSidebar.addEventListener("click", () => el.sidebar.classList.add("collapsed"));
el.conversations.addEventListener("click", (event) => {
  if (event.target.closest("button") && !event.target.closest(".conv-delete")) closeSidebarOnMobile();
});
el.newChat.addEventListener("click", closeSidebarOnMobile);
el.openMaterials.addEventListener("click", closeSidebarOnMobile);
closeSidebarOnMobile();

el.openLibrary.hidden = true;
el.reindex.hidden = true;
setMaterialsAdmin(false);
renderSidebar();
renderThread();
refreshStatus();
el.input.focus();
