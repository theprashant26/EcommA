/* ==========================================================================
   cart.js: the bag. State lives in localStorage under "jiai-bag-v1" as
   [{ id, qty }]. Names and prices are always read from PRODUCTS, so a data
   edit updates every open bag.
   ========================================================================== */
import { CONFIG } from "../data/config.js";
import {
  productById, brandById, formatPrice, escapeHTML, typeset, cutoutOf, imgTag, canBuy, prefersReducedMotion,
} from "./format.js";
import { toast } from "./toast.js";

const { gsap } = window;
const KEY = "jiai-bag-v1";
const MAX_QTY = 10;

/* ---- State ---------------------------------------------------------------- */
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((l) => productById(l.id) && l.qty > 0) : [];
  } catch { return []; }
}
function write(lines) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode: bag lives for this page only */ }
}

let lines = [];
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);

export const getLines = () => lines.map((l) => ({ ...l }));
export const count = () => lines.reduce((n, l) => n + l.qty, 0);
export const subtotal = () => lines.reduce((s, l) => s + productById(l.id).price * l.qty, 0);

function commit(next, { animateCount = true } = {}) {
  const before = count();
  lines = next;
  write(lines);
  render();
  updateCount(before, animateCount);
  listeners.forEach((fn) => fn(getLines()));
}

/** Add a product. Pass `from` (an <img> or element) to fly it to the bag. */
export function add(id, qty = 1, { from = null } = {}) {
  const p = productById(id);
  if (!canBuy(p)) return false;
  const next = getLines();
  const line = next.find((l) => l.id === id);
  if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
  else next.push({ id, qty: Math.min(MAX_QTY, qty) });
  if (from) flyToBag(from).then(() => commit(next));
  else commit(next);
  toast(`${p.fullName} added to your bag.`);
  return true;
}

export function setQty(id, qty) {
  const q = Math.max(0, Math.min(MAX_QTY, qty));
  commit(q === 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: q } : l)));
}
export const remove = (id) => setQty(id, 0);

/* ---- Rendering ------------------------------------------------------------- */
let els = {};

function render() {
  if (!els.list) return;
  if (!lines.length) {
    els.list.innerHTML = `
      <div class="bag__empty">
        <p class="bag__empty-title">Your bag is empty.</p>
        <p>Begin with something small and considered.</p>
        <a class="link-draw" href="shop.html">Browse the collection</a>
      </div>`;
    els.foot.hidden = true;
    return;
  }
  els.foot.hidden = false;
  els.list.innerHTML = `<ul class="bag__lines">${lines.map((l) => {
    const p = productById(l.id);
    const b = brandById(p.brand);
    return `
      <li class="bag-line" data-id="${escapeHTML(p.id)}">
        <a class="bag-line__img" href="product.html?id=${encodeURIComponent(p.id)}" tabindex="-1" aria-hidden="true">
          ${imgTag(cutoutOf(p), "", { lazy: false })}
        </a>
        <div class="bag-line__body">
          <p class="bag-line__brand">${escapeHTML(b?.name || "")}</p>
          <a class="bag-line__name" href="product.html?id=${encodeURIComponent(p.id)}">${typeset(p.name)}</a>
          <p class="bag-line__size">${escapeHTML(p.size)}</p>
          <div class="bag-line__row">
            <div class="stepper" role="group" aria-label="Quantity of ${escapeHTML(p.fullName)}">
              <button type="button" class="stepper__btn" data-step="-1" aria-label="Decrease quantity">−</button>
              <output class="stepper__val" aria-live="polite">${l.qty}</output>
              <button type="button" class="stepper__btn" data-step="1" aria-label="Increase quantity"${l.qty >= MAX_QTY ? " disabled" : ""}>+</button>
            </div>
            <p class="bag-line__price">${formatPrice(p.price * l.qty)}</p>
          </div>
          <button type="button" class="bag-line__remove" data-remove aria-label="Remove ${escapeHTML(p.fullName)}">Remove</button>
        </div>
      </li>`;
  }).join("")}</ul>`;
  els.subtotal.textContent = formatPrice(subtotal());
  const gap = CONFIG.freeShippingOver - subtotal();
  els.note.textContent = gap > 0
    ? `Free delivery on orders over ${formatPrice(CONFIG.freeShippingOver)}`
    : "Your order ships free.";
}

/* The count ticks: the old number slides up and out, the new one rises in. */
function updateCount(before, animate) {
  const n = count();
  document.querySelectorAll("[data-bag-count]").forEach((wrap) => {
    const btn = wrap.closest("[data-bag-button]");
    btn?.setAttribute("aria-label", n === 1 ? "Bag, 1 item" : `Bag, ${n} items`);
    wrap.classList.toggle("is-empty", n === 0);
    const old = wrap.querySelector("span");
    if (old && old.textContent === String(n)) return;
    const next = document.createElement("span");
    next.textContent = n;
    if (!animate || !old || prefersReducedMotion() || before === n) {
      wrap.replaceChildren(next);
      return;
    }
    const dir = n > before ? 1 : -1;
    wrap.appendChild(next);
    gsap.fromTo(next, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.4, ease: "power2.out" });
    gsap.to(old, { yPercent: -100 * dir, duration: 0.4, ease: "power2.out", onComplete: () => old.remove() });
  });
}

/* ---- Fly to bag -------------------------------------------------------------
   A clone of the product image travels along a quadratic bezier to the bag
   icon (0.8s). MotionPathPlugin is not in the stack, so the curve is computed
   by hand from a single progress tween. */
export function flyToBag(from) {
  const target = [...document.querySelectorAll("[data-bag-button]")].find((b) => b.offsetParent !== null);
  const src = from.tagName === "IMG" ? from : from.querySelector("img");
  if (!target || !src || prefersReducedMotion()) return Promise.resolve();

  const a = src.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const clone = src.cloneNode();
  clone.removeAttribute("id");
  clone.className = "fly-clone";
  clone.alt = "";
  Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(clone);

  const p0 = { x: 0, y: 0 };
  const p2 = { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2) };
  const p1 = { x: p2.x * 0.35, y: Math.min(p0.y, p2.y) - 160 }; // arc up, then down into the bag
  const state = { t: 0 };

  return new Promise((resolve) => {
    gsap.to(state, {
      t: 1, duration: 0.8, ease: "power2.inOut",
      onUpdate() {
        const t = state.t, u = 1 - t;
        const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
        const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
        const s = 1 - 0.86 * t;
        gsap.set(clone, { x, y, scale: s, opacity: 1 - 0.3 * t });
      },
      onComplete() { clone.remove(); resolve(); },
    });
  });
}

/* ---- Wiring ------------------------------------------------------------------ */
export function initCart() {
  const root = document.getElementById("bag");
  if (!root) return;
  els = {
    list: root.querySelector("[data-bag-list]"),
    foot: root.querySelector("[data-bag-foot]"),
    subtotal: root.querySelector("[data-bag-subtotal]"),
    note: root.querySelector("[data-bag-note]"),
  };

  lines = read();
  render();
  updateCount(0, false);

  els.list.addEventListener("click", (e) => {
    const li = e.target.closest(".bag-line");
    if (!li) return;
    const id = li.dataset.id;
    const step = e.target.closest("[data-step]");
    if (step) {
      const line = lines.find((l) => l.id === id);
      setQty(id, line.qty + Number(step.dataset.step));
      // keep focus on the same control after re-render
      root.querySelector(`.bag-line[data-id="${CSS.escape(id)}"] [data-step="${step.dataset.step}"]`)?.focus();
    }
    if (e.target.closest("[data-remove]")) {
      remove(id);
      root.querySelector(".bag-line__remove, .bag__empty a")?.focus();
    }
  });

  root.querySelector("[data-checkout]").addEventListener("click", () => toast("Checkout connects at launch."));

  // Keep several open tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const before = count();
    lines = read();
    render();
    updateCount(before, true);
  });

  // Any [data-add-to-bag="id"] button on any page adds that product.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-bag]");
    if (!btn) return;
    const qtyEl = btn.dataset.qtyFrom ? document.querySelector(btn.dataset.qtyFrom) : null;
    const qty = qtyEl ? Number(qtyEl.value || qtyEl.textContent) || 1 : 1;
    const from = btn.dataset.flyFrom ? document.querySelector(btn.dataset.flyFrom) : null;
    add(btn.dataset.addToBag, qty, { from });
  });
}

