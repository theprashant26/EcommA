/* ==========================================================================
   motion.js: Lenis + GSAP setup, shared reveal helpers, reduced-motion.
   GSAP, its plugins and Lenis arrive as deferred classic scripts, so they
   are globals by the time this module runs.
   ========================================================================== */
import { prefersReducedMotion } from "./format.js";

const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase } = window;

export const MQ = {
  desktop: "(min-width: 992px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 991.98px) and (prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
};

let lenis = null;
let mm = null;
let ready = false;

export function initMotion() {
  if (ready) return { lenis, mm };
  ready = true;

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
  CustomEase.create("komorebi", "0.22,0.61,0.36,1");
  gsap.defaults({ ease: "komorebi", duration: 1.2 });
  ScrollTrigger.config({ ignoreMobileResize: true });   // no re-measure when mobile URL bars slide

  // Smooth scroll only when motion is welcome (§13: no Lenis under reduced motion).
  if (!prefersReducedMotion() && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Stop Lenis while any offcanvas or modal is open.
  ["show.bs.offcanvas", "show.bs.modal"].forEach((ev) =>
    document.addEventListener(ev, () => lenis?.stop()));
  ["hidden.bs.offcanvas", "hidden.bs.modal"].forEach((ev) =>
    document.addEventListener(ev, () => {
      if (!document.querySelector(".offcanvas.show, .modal.show")) lenis?.start();
    }));

  // In-page anchors glide through Lenis (and respect the fixed header).
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href*='#']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    // "/site/" and "/site/index.html" are the same page (GitHub Pages serves the folder URL)
    const page = (path) => path.replace(/\/index\.html$/, "/");
    if (page(url.pathname) !== page(location.pathname) || url.search !== location.search || url.hash.length < 2) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    scrollToEl(target);
  });

  mm = gsap.matchMedia();

  // Images change layout heights; recalc triggers once everything is in.
  window.addEventListener("load", () => ScrollTrigger.refresh());

  // The grain texture is pure finish: fetch it on first interaction or when idle,
  // never in the critical path.
  const grain = () => document.documentElement.classList.add("is-loaded");
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, grain, { once: true, passive: true }));
  window.addEventListener("load", () => setTimeout(() => idle(grain), 10000));

  return { lenis, mm };
}

export const getLenis = () => lenis;
export const getMatchMedia = () => mm || initMotion().mm;

export function scrollToEl(target, offset = -24) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  // Make plain sections focusable for screen readers; never demote real controls.
  const focusable = el.matches("a[href], button, input, select, textarea, [tabindex], [contenteditable]");
  if (!focusable) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

/* ---- Scheduling: keep the main thread free for the first interaction -------- */

/** Run when the browser is idle (1.5s fallback where requestIdleCallback is missing). */
export const idle = (fn, timeout = 1500) =>
  ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, timeout));

/** Give the main thread back between chunks of setup work. */
export const yieldToMain = () =>
  (window.scheduler?.yield ? window.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

/** Call fn once when el comes within `margin` of the viewport (one observer + queue per margin). */
const nearObservers = new Map();   // margin → { io, queue: Map<element, callbacks[]> }
export function whenNear(el, fn, margin = "0px 0px 60% 0px") {
  if (!el) return;
  if (!("IntersectionObserver" in window)) { fn(); return; }
  let entry = nearObservers.get(margin);
  if (!entry) {
    const queue = new Map();
    const io = new IntersectionObserver((records) => records.forEach((r) => {
      if (!r.isIntersecting) return;
      io.unobserve(r.target);
      const cbs = queue.get(r.target) || [];
      queue.delete(r.target);
      cbs.forEach((cb) => cb());
    }), { rootMargin: margin });
    entry = { io, queue };
    nearObservers.set(margin, entry);
  }
  entry.queue.set(el, [...(entry.queue.get(el) || []), fn]);
  entry.io.observe(el);
}

/* ---- Motion vocabulary ----------------------------------------------------- */

/* Headline splits wait (briefly) for the web fonts; a split made in the fallback face is
   redone when they land, so line breaks always match the real type. */
const fontsApplied = document.fonts?.ready ?? Promise.resolve();
export const fontsReady = Promise.race([fontsApplied, new Promise((r) => setTimeout(r, 1500))]);
const splits = new Set();
export function trackSplit(instance) {
  if (instance) splits.add(instance);
  return instance;
}
fontsApplied.then(() => requestAnimationFrame(() => splits.forEach((s) => s.split?.())));

/** Headline mask-reveal, line by line. Re-splits after font load and resize. */
export async function revealLines(el, { duration = 1.1, stagger = 0.12, delay = 0, scroll = true } = {}) {
  if (!el || prefersReducedMotion()) return;
  // Split only as the headline approaches: SplitText measures layout, so doing
  // every heading at load would be one long main-thread task.
  if (scroll) await new Promise((r) => whenNear(el, r));
  await fontsReady;
  return trackSplit(SplitText.create(el, {
    type: "lines", mask: "lines", autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: "visible" });   // lifts a page's pre-split guard (e.g. the About text)
      return gsap.from(self.lines, {
        yPercent: 105, duration, stagger, delay, ease: "expo.out",
        scrollTrigger: scroll ? { trigger: el, start: "top 88%", once: true } : undefined,
      });
    },
  }));
}

/** Body copy simply appears: opacity only, 0.6s. */
export function appear(targets, { scroll = true, delay = 0 } = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return;
  if (prefersReducedMotion()) { gsap.set(els, { autoAlpha: 1 }); return; }
  els.forEach((el) => gsap.from(el, {
    autoAlpha: 0, duration: 0.6, delay, ease: "power1.out",
    scrollTrigger: scroll ? { trigger: el, start: "top 90%", once: true } : undefined,
  }));
}

/** A hairline that draws from left to right. */
export function drawLine(el, { duration = 1, scroll = true } = {}) {
  if (!el) return;
  if (prefersReducedMotion()) return;
  return gsap.from(el, {
    scaleX: 0, transformOrigin: "0 50%", duration, ease: "komorebi",
    scrollTrigger: scroll ? { trigger: el, start: "top 85%", once: true } : undefined,
  });
}

/** Count a number up (coordinates, altitude) with tabular numerals. */
export function countUp(el, to, { from = 0, decimals = 2, duration = 1.4, format = (v) => v, scroll = true } = {}) {
  if (!el) return;
  const obj = { v: from };
  const render = () => { el.textContent = format(obj.v.toFixed(decimals)); };
  if (prefersReducedMotion()) { obj.v = to; render(); return; }
  render();
  return gsap.to(obj, {
    v: to, duration, ease: "komorebi", onUpdate: render,
    scrollTrigger: scroll ? { trigger: el, start: "top 90%", once: true } : undefined,
  });
}
