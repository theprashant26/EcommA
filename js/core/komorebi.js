/* ==========================================================================
   komorebi.js: sunlight through leaves. The site's one signature.

   Structure (injected, decorative, aria-hidden):
     .komorebi              fixed, full viewport, multiply-blended onto the page
       .komorebi__wash      the time-of-day tint (--light-tint)
       .komorebi__time      time-of-day transform: rotation, scaleY, opacity
         .komorebi__drift   the breeze: slow x / y / rotation sway
           <picture>        leaf shadows, 120% of the viewport

   The time and drift transforms live on separate elements so the breeze
   never fights the time-of-day tween.
   ========================================================================== */
import { prefersReducedMotion } from "./format.js";

const { gsap } = window;

export const STAGES = {
  morning: { rotation: -18, scaleY: 1.35, opacity: 0.16, tint: "#FFFDF7" },
  day:     { rotation: 0,   scaleY: 1,    opacity: 0.12, tint: "#FFFFFF" },
  evening: { rotation: 22,  scaleY: 1.55, opacity: 0.18, tint: "#FFF6EF" },
  night:   { rotation: 8,   scaleY: 1.1,  opacity: 0.07, tint: "#F6F7FB" },
};

let root, timeEl, driftEl, current = null, loaded = false;

/**
 * Mount the layer. `stage` is where the page starts; `fadeIn` fades the
 * leaves from 0 (the home page load sequence uses it).
 */
export function initKomorebi({ stage = "morning", fadeIn = false, fadeDelay = 0 } = {}) {
  if (root) return api;

  // The leaves are decoration: their image is requested only after the page has
  // loaded, so it never competes with the hero image, fonts or scripts.
  root = document.createElement("div");
  root.className = "komorebi";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="komorebi__wash"></div>
    <div class="komorebi__time">
      <div class="komorebi__drift">
        <picture>
          <source media="(max-width: 767.98px)" data-srcset="assets/overlays/komorebi-leaves-mobile.webp" width="1200" height="800">
          <img data-src="assets/overlays/komorebi-leaves.webp" alt="" width="2400" height="1600" decoding="async" fetchpriority="low">
        </picture>
      </div>
    </div>`;
  document.body.prepend(root);
  timeEl = root.querySelector(".komorebi__time");
  driftEl = root.querySelector(".komorebi__drift");

  const reduced = prefersReducedMotion();
  const start = reduced ? "morning" : stage;
  const s = STAGES[start];
  current = start;
  gsap.set(timeEl, { rotation: s.rotation, scaleY: s.scaleY, opacity: 0 });
  document.documentElement.style.setProperty("--light-tint", s.tint);

  // Fade the leaves in once their image is ready: on the home page as part of
  // the load sequence (after the logo moment), elsewhere simply and quickly.
  const t0 = performance.now();
  const reveal = () => {
    loaded = true;
    document.documentElement.classList.add("komorebi-ready");   // other leaf-light details (e.g. on a bottle) may switch on now
    const target = STAGES[current].opacity;
    if (reduced) { gsap.set(timeEl, { opacity: target }); return; }
    const elapsed = (performance.now() - t0) / 1000;
    gsap.to(timeEl, { opacity: target, duration: fadeIn ? 1.2 : 0.8, delay: fadeIn ? Math.max(0, fadeDelay - elapsed) : 0, ease: "power1.out" });
  };
  const load = () => {
    root.classList.add("is-on");   // the blend layer joins the page only now, never in the first frame
    const source = root.querySelector("source");
    const img = root.querySelector("img");
    source.srcset = source.dataset.srcset;
    img.src = img.dataset.src;
    (img.decode ? img.decode() : Promise.resolve()).then(reveal, reveal);
  };
  // After load, and after the browser has had a quiet moment: the page's own
  // images (often its largest paint) always get the connection first.
  const later = () => ("requestIdleCallback" in window ? requestIdleCallback(() => setTimeout(load, 600), { timeout: 2000 }) : setTimeout(load, 1200));
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });

  if (reduced) return api; // static at morning values

  // The breeze: two out-of-phase yoyo tweens (17s and 23s) never line up,
  // so the sway never visibly repeats. Amplitude ≈1.5% and 0.6°.
  gsap.to(driftEl, { xPercent: 1.5, rotation: 0.6, duration: 17, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.fromTo(driftEl, { yPercent: -0.75 }, { yPercent: 0.75, duration: 23, ease: "sine.inOut", yoyo: true, repeat: -1 });

  // Save battery when the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    gsap.getTweensOf(driftEl).forEach((t) => (document.hidden ? t.pause() : t.resume()));
  });

  return api;
}

/** Swing the light to a time of day: morning | day | evening | night. */
export function setTimeOfDay(stage) {
  if (!root || !STAGES[stage] || stage === current) return;
  if (prefersReducedMotion()) return; // stays at morning
  current = stage;
  const s = STAGES[stage];
  // Before the leaves have arrived, only the angle and length change; reveal() fades to s.opacity.
  gsap.to(timeEl, { rotation: s.rotation, scaleY: s.scaleY, ...(loaded ? { opacity: s.opacity } : {}), duration: 2, ease: "komorebi", overwrite: "auto" });
  gsap.to(document.documentElement, { "--light-tint": s.tint, duration: 2, ease: "komorebi", overwrite: "auto" });
}

export const getTimeOfDay = () => current;

const api = { setTimeOfDay, getTimeOfDay };
