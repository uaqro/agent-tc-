/** Backoffice de DamIAn: métricas de uso leídas de /api/stats. Todo el texto entra por textContent. */

import { apiFetch } from "./api.js";

const REFRESH_MS = 30_000;

const el = {
  tiles: document.getElementById("tiles"),
  perDay: document.getElementById("per-day"),
  perDayNote: document.getElementById("per-day-note"),
  deviceTypes: document.getElementById("device-types"),
  countries: document.getElementById("countries"),
  guides: document.getElementById("guides"),
  pdfs: document.getElementById("pdfs"),
  recent: document.getElementById("recent"),
  search: document.getElementById("search"),
  updated: document.getElementById("updated"),
  refresh: document.getElementById("refresh"),
  error: document.getElementById("error"),
  tooltip: document.getElementById("tooltip"),
  periods: document.querySelectorAll("[data-days]"),
};

let days = 30;
let data = null;

const nf = new Intl.NumberFormat("es-MX");
const DEVICE_LABELS = { mobile: "Móvil", tablet: "Tableta", desktop: "Escritorio", desconocido: "Desconocido" };
const STATUS = {
  ok: { icon: "✓", label: "Con guía" },
  no_guide: { icon: "!", label: "Sin guía" },
  refusal: { icon: "!", label: "Rechazada" },
  error: { icon: "✕", label: "Error" },
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function svg(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

function seconds(ms) {
  return ms ? `${(ms / 1000).toFixed(1)} s` : "—";
}

function pdfTitle(name) {
  return String(name)
    .normalize("NFC")
    .replace(/\.pdf$/i, "")
    .replace(/^TC\+_Gu[ií]a_\s*/i, "")
    .replace(/_/g, " ")
    .replace(/\s*\(\d+\)/g, "")
    .replace("-combinado", " (guía completa)")
    .trim();
}

/* ---------- Indicadores ---------- */

function renderTiles(k) {
  const share = (part) => (k.questions ? `${Math.round((part / k.questions) * 100)} % de las preguntas` : "");
  const tiles = [
    { label: "Dispositivos ahora", value: nf.format(k.devices_now), note: "activos en los últimos 5 min", live: true },
    { label: "Dispositivos 24 h", value: nf.format(k.devices_24h), note: "distintos en las últimas 24 h" },
    { label: "Dispositivos", value: nf.format(k.devices_period), note: "distintos en el periodo" },
    { label: "Preguntas", value: nf.format(k.questions), note: `${nf.format(k.conversations)} conversaciones` },
    { label: "Descargas de PDF", value: nf.format(k.downloads), note: "guías descargadas" },
    { label: "Tiempo de respuesta", value: seconds(k.avg_latency_ms), note: "promedio por respuesta" },
    { label: "Sin guía relacionada", value: nf.format(k.no_guide), note: share(k.no_guide) || "fuera de alcance o sin cobertura" },
    { label: "Errores", value: nf.format(k.errors), note: share(k.errors) || "respuestas con error" },
  ];
  el.tiles.replaceChildren(
    ...tiles.map((tile) => {
      const item = node("article", `tile${tile.live ? " live" : ""}`);
      item.append(node("span", "tile-label", tile.label), node("span", "tile-value", tile.value), node("span", "tile-note", tile.note));
      return item;
    }),
  );
}

/* ---------- Preguntas por día (columnas) ---------- */

function dayRange(perDay) {
  const byDay = new Map(perDay.map((row) => [row.day, row]));
  const out = [];
  const today = new Date();
  for (let i = Math.min(days, 90) - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    out.push({ day: key, questions: byDay.get(key)?.questions ?? 0, devices: byDay.get(key)?.devices ?? 0 });
  }
  return out;
}

function niceMax(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return value;
}

function formatDay(key, long = false) {
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString("es-MX", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
}

function showTooltip(event, title, lines) {
  el.tooltip.replaceChildren(node("strong", "", title), ...lines.map((line) => node("div", "", line)));
  el.tooltip.hidden = false;
  const { innerWidth } = window;
  const rect = el.tooltip.getBoundingClientRect();
  const x = Math.min(event.clientX + 12, innerWidth - rect.width - 8);
  el.tooltip.style.left = `${Math.max(8, x)}px`;
  el.tooltip.style.top = `${Math.max(8, event.clientY - rect.height - 12)}px`;
}

function hideTooltip() {
  el.tooltip.hidden = true;
}

function renderPerDay(perDay) {
  const rows = dayRange(perDay);
  const total = rows.reduce((sum, row) => sum + row.questions, 0);
  el.perDayNote.textContent = `${nf.format(total)} preguntas · últimos ${rows.length} días`;

  const width = Math.max(320, el.perDay.clientWidth || 900);
  const height = 220;
  const pad = { top: 10, right: 8, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...rows.map((row) => row.questions), 1));
  const slot = plotW / rows.length;
  const gap = Math.min(2, slot * 0.2);
  const barW = Math.max(1, slot - gap);
  const y = (value) => pad.top + plotH - (value / max) * plotH;

  const root = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": `Preguntas por día: ${total} en total` });

  for (let i = 0; i <= 4; i++) {
    const value = (max / 4) * i;
    const lineY = y(value);
    root.append(svg("line", { class: "grid-line", x1: pad.left, x2: width - pad.right, y1: lineY, y2: lineY }));
    const label = svg("text", { class: "axis-label", x: pad.left - 6, y: lineY + 4, "text-anchor": "end" });
    label.textContent = nf.format(Math.round(value));
    root.append(label);
  }

  const labelEvery = Math.ceil(rows.length / 8);
  rows.forEach((row, index) => {
    const x = pad.left + index * slot + gap / 2;
    const barH = (row.questions / max) * plotH;
    const group = svg("g");
    const hit = svg("rect", { class: "hit", x: pad.left + index * slot, y: pad.top, width: slot, height: plotH });
    const radius = Math.min(4, barW / 2, barH);
    const top = y(row.questions);
    // Columna con esquinas superiores redondeadas, anclada a la línea base.
    const bar = svg("path", {
      class: "bar",
      d:
        barH <= 0
          ? ""
          : `M${x},${top + radius} q0,-${radius} ${radius},-${radius} h${barW - 2 * radius} q${radius},0 ${radius},${radius} V${y(0)} H${x} Z`,
    });
    group.append(hit, bar);
    group.addEventListener("pointermove", (event) => {
      bar.classList.add("active");
      showTooltip(event, formatDay(row.day, true), [
        `${nf.format(row.questions)} preguntas`,
        `${nf.format(row.devices)} dispositivos`,
      ]);
    });
    group.addEventListener("pointerleave", () => {
      bar.classList.remove("active");
      hideTooltip();
    });
    root.append(group);

    if (index % labelEvery === 0 || index === rows.length - 1) {
      const label = svg("text", { class: "axis-label", x: x + barW / 2, y: height - 8, "text-anchor": "middle" });
      label.textContent = formatDay(row.day);
      root.append(label);
    }
  });

  el.perDay.replaceChildren(root);
}

/* ---------- Barras horizontales ---------- */

function renderBars(container, items, { format = (label) => label, unit = "" } = {}) {
  if (!items.length) {
    container.replaceChildren(node("p", "empty", "Sin datos en este periodo."));
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  container.replaceChildren(
    ...items.map((item) => {
      const row = node("div", "bar-row");
      const label = format(item.label);
      const name = node("span", "bar-label", label);
      name.title = label;
      const track = node("div", "bar-track");
      const fill = node("div", "bar-fill");
      fill.style.width = `${(item.value / max) * 100}%`;
      track.append(fill);
      row.append(name, node("span", "bar-value", `${nf.format(item.value)}${unit}`), track);
      return row;
    }),
  );
}

/* ---------- Preguntas recientes ---------- */

function renderRecent(recent) {
  const query = el.search.value.trim().toLowerCase();
  const rows = recent.filter(
    (row) => !query || `${row.question ?? ""} ${(row.related_guides ?? []).join(" ")}`.toLowerCase().includes(query),
  );
  if (!rows.length) {
    const tr = node("tr");
    const td = node("td", "empty", recent.length ? "Ninguna pregunta coincide con el filtro." : "Aún no hay preguntas en este periodo.");
    td.colSpan = 6;
    tr.append(td);
    el.recent.replaceChildren(tr);
    return;
  }
  el.recent.replaceChildren(
    ...rows.map((row) => {
      const tr = node("tr");
      const date = new Date(row.created_at);
      tr.append(
        node(
          "td",
          "muted",
          date.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        ),
      );

      const questionCell = node("td");
      const details = node("details");
      details.append(node("summary", "", row.question ?? ""));
      if (row.answer) details.append(node("p", "answer", row.answer));
      questionCell.append(details);
      tr.append(questionCell);

      tr.append(node("td", "", (row.related_guides ?? []).join(" · ") || "—"));

      const status = STATUS[row.status] ?? { icon: "·", label: row.status ?? "—" };
      const statusCell = node("td");
      statusCell.append(node("span", `badge ${row.status ?? ""}`, `${status.icon} ${status.label}`));
      tr.append(statusCell);

      tr.append(node("td", "num", seconds(row.latency_ms)));

      const where = [row.city, row.country].filter(Boolean).join(", ");
      const device = [DEVICE_LABELS[row.device_type] ?? row.device_type, row.os, where].filter(Boolean).join(" · ");
      const deviceCell = node("td", "muted", device || "—");
      deviceCell.title = `Dispositivo ${row.device} · ${row.browser ?? ""}`;
      tr.append(deviceCell);
      return tr;
    }),
  );
}

/* ---------- Carga ---------- */

function render() {
  renderTiles(data.kpis);
  renderPerDay(data.per_day);
  renderBars(el.deviceTypes, data.device_types, { format: (label) => DEVICE_LABELS[label] ?? label });
  renderBars(el.countries, data.countries);
  renderBars(el.guides, data.guides);
  renderBars(el.pdfs, data.pdfs, { format: pdfTitle });
  renderRecent(data.recent);
}

async function load() {
  el.refresh.disabled = true;
  try {
    const response = await apiFetch(`/api/stats?days=${days}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail ?? `Error ${response.status}`);
    data = body;
    el.error.hidden = true;
    render();
    el.updated.textContent = `Actualizado ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    el.error.textContent = `No se pudieron cargar las métricas: ${error.message}`;
    el.error.hidden = false;
  } finally {
    el.refresh.disabled = false;
  }
}

for (const button of el.periods) {
  button.addEventListener("click", () => {
    days = Number(button.dataset.days);
    for (const other of el.periods) other.setAttribute("aria-pressed", String(other === button));
    load();
  });
}
el.refresh.addEventListener("click", load);
el.search.addEventListener("input", () => data && renderRecent(data.recent));
el.perDay.addEventListener("pointerleave", hideTooltip);

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => data && renderPerDay(data.per_day), 150);
});

load();
setInterval(() => {
  if (!document.hidden) load();
}, REFRESH_MS);
