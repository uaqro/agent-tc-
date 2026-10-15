/**
 * Renderizador de Markdown mínimo y seguro: todo el texto entra vía `textContent`,
 * por lo que ningún HTML devuelto por el modelo se interpreta (sin riesgo de XSS).
 */

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

function appendInline(target, text) {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) {
      target.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const token = match[0];
    let element;
    if (token.startsWith("`")) {
      element = document.createElement("code");
      element.textContent = token.slice(1, -1);
    } else if (token.startsWith("**")) {
      element = document.createElement("strong");
      element.textContent = token.slice(2, -2);
    } else {
      element = document.createElement("em");
      element.textContent = token.slice(1, -1);
    }
    target.appendChild(element);
    last = match.index + token.length;
  }
  if (last < text.length) {
    target.appendChild(document.createTextNode(text.slice(last)));
  }
}

function renderTextBlocks(source, fragment) {
  const lines = source.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      const element = document.createElement(`h${level}`);
      appendInline(element, heading[2]);
      fragment.appendChild(element);
      index += 1;
      continue;
    }

    const isBullet = (value) => /^\s*[-*+]\s+/.test(value);
    const isOrdered = (value) => /^\s*\d+[.)]\s+/.test(value);

    if (isBullet(line) || isOrdered(line)) {
      const ordered = isOrdered(line);
      const list = document.createElement(ordered ? "ol" : "ul");
      const matcher = ordered ? isOrdered : isBullet;
      while (index < lines.length && matcher(lines[index])) {
        const item = document.createElement("li");
        appendInline(item, lines[index].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ""));
        list.appendChild(item);
        index += 1;
      }
      fragment.appendChild(list);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBullet(lines[index]) &&
      !isOrdered(lines[index]) &&
      !/^#{1,6}\s/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    const element = document.createElement("p");
    appendInline(element, paragraph.join("\n"));
    fragment.appendChild(element);
  }
}

export function renderMarkdown(text) {
  const fragment = document.createDocumentFragment();
  const fence = /```[ \t]*([\w+-]*)\n?([\s\S]*?)(?:```|$)/g;
  let cursor = 0;

  for (const match of text.matchAll(fence)) {
    if (match.index > cursor) {
      renderTextBlocks(text.slice(cursor, match.index), fragment);
    }
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = match[2];
    if (match[1]) code.dataset.language = match[1];
    pre.appendChild(code);
    fragment.appendChild(pre);
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    renderTextBlocks(text.slice(cursor), fragment);
  }
  return fragment;
}
