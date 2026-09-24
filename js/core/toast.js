/* ==========================================================================
   toast.js: one bottom-centre ink pill, shown for 3s. Announced politely.
   ========================================================================== */
let el, timer;

function ensure() {
  if (el) return el;
  el = document.createElement("div");
  el.className = "toast-pill";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  return el;
}

export function toast(message, ms = 3000) {
  const t = ensure();
  clearTimeout(timer);
  t.textContent = message;
  t.classList.add("is-visible");
  timer = setTimeout(() => t.classList.remove("is-visible"), ms);
}
