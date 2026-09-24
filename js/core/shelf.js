/* ==========================================================================
   shelf.js: products standing on a thin line. Used by the home collection,
   brand pages, "Complete the ritual" on the PDP, and (the stand + turn only)
   the shop grid.

   Markup contract for a "stand" (anything bindTurn can animate):
     [data-id]
       .shelf__stand > .shelf__shadow + .shelf__figure > .shelf__pic > img.shelf__img
   ========================================================================== */
import { productById, prefersReducedMotion } from "./format.js";
import { fillShelf } from "../views/blocks.js";
export { standHTML, shelfItemHTML, shelfShellHTML, fillShelf } from "../views/blocks.js";
import { getMatchMedia, MQ } from "./motion.js";

const { gsap } = window;

/**
 * Render products onto a shelf.
 *   <div class="shelf" data-shelf> <ul class="shelf__row" data-shelf-row></ul> <span class="shelf__line" data-shelf-line></span> </div>
 */
export function renderShelf(shelfEl, products, opts = {}) {
  const row = fillShelf(shelfEl, products, opts);
  animateShelf(shelfEl);
  bindTurn(row);
  return row;
}

/** The line draws, then each product is lowered onto it by hand. */
export function animateShelf(shelfEl) {
  const mm = getMatchMedia();
  const q = (sel) => shelfEl.querySelectorAll(sel);
  mm.add(MQ.desktop, () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: shelfEl, start: "top 78%", once: true } });
    const line = shelfEl.querySelector("[data-shelf-line]");
    if (line) tl.from(line, { scaleX: 0, transformOrigin: "0 50%", duration: 1, ease: "komorebi" });
    tl.from(q(".shelf__figure"), { y: -40, autoAlpha: 0, duration: 1.1, stagger: 0.15, ease: "expo.out" }, line ? "-=0.35" : 0)
      .from(q(".shelf__shadow"), { autoAlpha: 0, scaleX: 0.6, duration: 0.9, stagger: 0.15, ease: "expo.out" }, "<0.2")
      .from(q(".shelf__item > :not(.shelf__stand)"), { autoAlpha: 0, duration: 0.6, stagger: 0.03, ease: "power1.out" }, "-=0.8");
  });
  mm.add(MQ.mobile, () => {
    gsap.from(q(".shelf__item"), {
      y: -24, autoAlpha: 0, duration: 1, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: shelfEl, start: "top 82%", once: true },
    });
  });
}

/* ---- Hover: lift, tighten the shadow, and for tubes a quick half-turn -------- */
const FRAMES = 36, FPS = 24;
const spinCache = new Map();   // folder → Promise<string[]>
function loadSpin(folder) {
  if (!spinCache.has(folder)) {
    const urls = Array.from({ length: FRAMES }, (_, i) => `${folder}${String(i).padStart(3, "0")}.webp`);
    spinCache.set(folder, Promise.all(urls.map((u) => {
      const im = new Image();
      im.decoding = "async";
      im.src = u;
      return im.decode().then(() => u, () => u);
    })));
  }
  return spinCache.get(folder);
}

const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Bind the hover turn to every [data-id] inside `root` that has a stand.
 * Spin frames (spin/000–035) load only on first hover and play at 24fps:
 * half a turn in, and the rest of the turn back to the front on leave.
 */
export function bindTurn(root, itemSelector = "[data-id]") {
  if (!finePointer() || prefersReducedMotion()) return;
  root.querySelectorAll(itemSelector).forEach((item) => {
    if (item.dataset.turnBound) return;
    const fig = item.querySelector(".shelf__figure");
    if (!fig) return;
    item.dataset.turnBound = "1";
    const p = productById(item.dataset.id);
    const shadow = item.querySelector(".shelf__shadow");
    const base = item.querySelector(".shelf__img");
    let spinEl = null, frames = null, spinTween = null;
    const playhead = { f: 0 };

    const show = (f) => { if (spinEl && frames) spinEl.src = frames[Math.round(f) % FRAMES]; };
    const play = (to, done) => {
      spinTween?.kill();
      const dist = Math.abs(to - playhead.f);
      spinTween = gsap.to(playhead, { f: to, duration: dist / FPS, ease: "none", onUpdate: () => show(playhead.f), onComplete: done });
    };

    item.addEventListener("pointerenter", async (e) => {
      if (e.pointerType !== "mouse") return;
      gsap.to(fig, { y: -10, duration: 0.6, ease: "komorebi", overwrite: "auto" });
      if (shadow) gsap.to(shadow, { scaleX: 0.82, opacity: 1, duration: 0.6, ease: "komorebi", overwrite: "auto" });
      if (!p?.spin) return;
      frames = frames || await loadSpin(p.spin);
      if (!item.matches(":hover")) return;
      if (!spinEl) {
        spinEl = document.createElement("img");
        spinEl.className = "shelf__spin";
        spinEl.alt = "";
        spinEl.width = 720; spinEl.height = 1080;
        item.querySelector(".shelf__pic").appendChild(spinEl);
      }
      if (playhead.f >= FRAMES) playhead.f = 0;
      show(playhead.f);
      spinEl.style.visibility = "visible";
      base.style.visibility = "hidden";
      play(FRAMES / 2);
    });
    item.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      gsap.to(fig, { y: 0, duration: 0.8, ease: "komorebi", overwrite: "auto" });
      if (shadow) gsap.to(shadow, { scaleX: 1, opacity: 0.75, duration: 0.8, ease: "komorebi", overwrite: "auto" });
      if (!spinEl || !frames) return;
      play(FRAMES, () => {
        playhead.f = 0;
        base.style.visibility = "";
        spinEl.style.visibility = "hidden";
      });
    });
  });
}

