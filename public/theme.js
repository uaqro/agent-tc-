// Se carga en <head> para fijar `data-mode` (contrato de tema de Flow) antes de pintar.
(() => {
  let mode = null;
  try {
    mode = localStorage.getItem("damian.mode");
  } catch {}
  if (mode !== "light" && mode !== "dark") {
    mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.mode = mode;
})();
