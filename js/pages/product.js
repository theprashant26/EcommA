/* ==========================================================================
   product.js: product.html?id=… (§9.1): behaviour. The markup is rendered by
   views/product-view.js (loaded early, async); this module brings it to life:
   the 3D viewer or the bottle tilt, the branch, the day line, the origin
   block, quantity, the sticky bar and the ritual shelf.
   ========================================================================== */
import { initMotion, revealLines, appear, idle, scrollToEl } from "../core/motion.js";
import { initKomorebi } from "../core/komorebi.js";
import { initHeader } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import { prefersReducedMotion } from "../core/format.js";
import { animateShelf, bindTurn } from "../core/shelf.js";
import { mountBranch, mountOriginBlock } from "../core/illustrations.js";
import { product as p, found } from "../views/product-view.js";

const { gsap, ScrollTrigger } = window;
const main = document.querySelector("[data-pdp]");
const reduced = prefersReducedMotion();

initMotion();
initKomorebi({ stage: p?.ritual || "morning" });   // the light follows the product's time of day
initHeader();
initCart();
initSearch();

main.querySelectorAll("[data-shelf]").forEach((shelf) => { animateShelf(shelf); bindTurn(shelf); });
if (found) {
  if (p.model) initViewer(p); else initTilt();
  mountBranch(main.querySelector("[data-pdp-branch]"));
  initLongevity();
  mountOriginBlock(main.querySelector("#pdp-origin"));
  initStepper();
  initBuybar();
  main.querySelectorAll("[data-reveal-lines]").forEach((el) => revealLines(el));
  appear(main.querySelectorAll("[data-appear]"));
}

/* ==========================================================================
   Behaviour
   ========================================================================== */

/* Tubes: the lazy 3D stage (same module as the hero). */
function initViewer(p) {
  const stageEl = main.querySelector("[data-stage]");
  const reset = main.querySelector("[data-reset]");
  const hasWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  const wants = window.matchMedia("(min-width: 768px)").matches && !reduced && !navigator.connection?.saveData && hasWebGL;
  if (!wants) return;
  const go = () => idle(async () => {
    try {
      const { createStage } = await import("../three/viewer.js");
      const stage = await createStage(stageEl, { productId: p.id, interactive: true });
      stageEl.classList.add("is-3d");
      stageEl.tabIndex = 0;
      stageEl.setAttribute("role", "group");
      stageEl.setAttribute("aria-roledescription", "3D viewer");
      stageEl.setAttribute("aria-label", `${p.fullName}. Use the left and right arrow keys to turn it.`);
      stage.intro({ duration: 1.2 });
      reset.hidden = false;
      reset.addEventListener("click", () => stage.reset());
      stageEl.addEventListener("stage:lost", () => {
        stageEl.classList.remove("is-3d");            // the still image fades back in
        stageEl.removeAttribute("tabindex");
        reset.hidden = true;
      }, { once: true });
      const hint = main.querySelector("[data-stage-hint]");
      hint.hidden = false;
      gsap.fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 0.8 });
      const hide = () => gsap.to(hint, { autoAlpha: 0, duration: 0.6 });
      stageEl.addEventListener("stage:drag", hide, { once: true });
      stageEl.addEventListener("keydown", (e) => { if (e.key.startsWith("Arrow")) hide(); }, { once: true });
    } catch (err) {
      console.warn("3D stage unavailable, keeping the still image.", err);
    }
  });
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/* Perfumes: the bottle leans toward the pointer (max 6°). */
function initTilt() {
  const wrap = main.querySelector("[data-tilt]");
  const inner = main.querySelector("[data-tilt-inner]");
  if (!wrap || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const rx = gsap.quickTo(inner, "rotationX", { duration: 0.8, ease: "power3" });
  const ry = gsap.quickTo(inner, "rotationY", { duration: 0.8, ease: "power3" });
  gsap.set(wrap, { perspective: 900 });
  wrap.addEventListener("pointermove", (e) => {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ry(x * 12);    // ±6°
    rx(-y * 12);
  });
  wrap.addEventListener("pointerleave", () => { rx(0); ry(0); });
}

/* L’Arrivé: the day line fills as it scrolls into view. */
function initLongevity() {
  const fill = main.querySelector("[data-longevity-fill]");
  if (!fill) return;
  if (reduced) { gsap.set(fill, { scaleX: 1 }); return; }
  gsap.fromTo(fill, { scaleX: 0 }, {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: "[data-longevity]", start: "top 85%", end: "top 40%", scrub: 0.6 },
  });
}

function initStepper() {
  const out = main.querySelector("#pdp-qty");
  if (!out) return;
  main.querySelectorAll("[data-qty-step]").forEach((btn) => btn.addEventListener("click", () => {
    const v = Math.max(1, Math.min(10, Number(out.value || out.textContent) + Number(btn.dataset.qtyStep)));
    out.value = String(v);
    out.textContent = String(v);
    main.querySelector('[data-qty-step="-1"]').disabled = v <= 1;
    main.querySelector('[data-qty-step="1"]').disabled = v >= 10;
  }));
  main.querySelector('[data-qty-step="-1"]').disabled = true;
}

/* The sticky bar slides up once the story is under way (section 3) and steps
   aside while "Make it yours" itself is on screen. */
function initBuybar() {
  const bar = main.querySelector("[data-buybar]");
  const inside = main.querySelector("#pdp-inside");
  const buy = main.querySelector("#pdp-buy");
  if (!bar || !inside || !buy) return;
  let past = false, buyVisible = false, shown = false;
  const update = () => {
    const want = past && !buyVisible;
    if (want === shown) return;
    shown = want;
    bar.classList.toggle("is-shown", want);
    bar.setAttribute("aria-hidden", String(!want));
    bar.inert = !want;
    document.body.classList.toggle("has-buybar", want);
  };
  ScrollTrigger.create({ trigger: inside, start: "top 85%", onEnter: () => { past = true; update(); }, onLeaveBack: () => { past = false; update(); } });
  new IntersectionObserver(([e]) => { buyVisible = e.isIntersecting; update(); }, { threshold: 0.15 }).observe(buy);

  // "Notify me": the letters form in the footer is the one sign-up.
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-notify]")) return;
    const field = document.querySelector("#footer-email");
    if (field) scrollToEl(field, -window.innerHeight / 2);
  });
}
