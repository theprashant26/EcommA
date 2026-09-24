/* ==========================================================================
   home.js: index.html (§8). Sections in page order:
     8.1 hero · 8.2 shelf · 8.3 ritual · 8.4 One Origin · 8.5 house
     8.6 L’Arrivé · 8.7 story · 8.8 letters (wired by header.js)
   ========================================================================== */
import { initMotion, getMatchMedia, revealLines, appear, yieldToMain, idle, fontsReady, trackSplit, MQ } from "../core/motion.js";
import { initKomorebi, setTimeOfDay } from "../core/komorebi.js";
import { initHeader } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import {
  visibleProducts, visibleBrands, productsOfBrand, brandById, productById, originById, escapeHTML, typeset, cutoutOf, imgTag, altFor,
  productURL, brandURL, prefersReducedMotion,
} from "../core/format.js";
import { renderShelf } from "../core/shelf.js";
import { applyRidgeColours, mountRange, mountBranch, countCoords, altitudeNumber } from "../core/illustrations.js";

const { gsap, ScrollTrigger, SplitText } = window;

initMotion();
initKomorebi({ stage: "morning", fadeIn: true, fadeDelay: 0.4 });   // leaves follow the logo moment
initHeader();
initCart();
initSearch();

const mm = getMatchMedia();
const reduced = prefersReducedMotion();
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* Shelf image: tubes use the cutout, perfumes their lifted-glass hero. */
const standImage = (p) => cutoutOf(p);


/* ==========================================================================
   8.1 HERO
   ========================================================================== */
const hero = {
  stageEl: document.querySelector("[data-stage]"),
  switcher: document.querySelector("[data-switcher]"),
  still: document.querySelector("[data-stage-still]"),
  poster: document.querySelector("[data-stage-poster]"),
  hint: document.querySelector("[data-stage-hint]"),
  current: visibleProducts()[0]?.id,
  stage3d: null,
};
const phone = window.matchMedia("(max-width: 767.98px)");

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
const wantsWebGL = () => !phone.matches && !reduced && !navigator.connection?.saveData && hasWebGL();

/* ---- Switcher: round thumbnails on tablet/desktop, a cutout row on phones ---- */
function renderSwitcher() {
  const products = visibleProducts();
  if (phone.matches) {
    hero.switcher.classList.add("switcher--row");
    hero.switcher.setAttribute("aria-label", "The collection");
    hero.switcher.innerHTML = products.map((p) => `
      <a class="switcher__link" href="${productURL(p)}">
        ${imgTag(standImage(p), "", { extra: 'fetchpriority="low"' })}
        <span>${escapeHTML(p.name)}</span>
      </a>`).join("");
    return;
  }
  hero.switcher.classList.remove("switcher--row");
  hero.switcher.setAttribute("aria-label", "Choose a product to view");
  hero.switcher.innerHTML = products.map((p) => `
    <button class="switcher__btn" type="button" data-id="${escapeHTML(p.id)}" aria-pressed="${p.id === hero.current}"
            aria-label="Show ${escapeHTML(p.fullName)}">
      <span class="switcher__thumb">${imgTag(standImage(p), "", { lazy: false, extra: 'fetchpriority="low"' })}</span>
      <span class="switcher__name" aria-hidden="true">${escapeHTML(p.name)}</span>
    </button>`).join("");
}

function choose(id) {
  if (!productById(id)) return;
  hero.current = id;
  hero.switcher.querySelectorAll("[data-id]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  const p = productById(id);
  hero.stageEl.setAttribute("aria-label", `${p.fullName}. Use the left and right arrow keys to turn it.`);
  if (hero.stage3d) hero.stage3d.setProduct(id);
  else showStill(id);
}

/* Image stage (fallback): the current product sinks, the next rises into the light. */
function showStill(id) {
  const p = productById(id);
  const wrap = hero.still;
  const first = wrap.hidden;
  wrap.hidden = false;
  if (first) gsap.to(hero.poster, { autoAlpha: 0, duration: reduced ? 0 : 0.6 });
  const prev = wrap.querySelector(".stage__still-img");
  const img = document.createElement("div");
  img.className = "stage__still-img";
  img.innerHTML = imgTag(standImage(p), altFor(p), { lazy: false });
  wrap.appendChild(img);
  if (reduced) { prev?.remove(); return; }
  if (prev) gsap.to(prev, { y: 24, autoAlpha: 0, duration: 0.5, ease: "power2.in", onComplete: () => prev.remove() });
  gsap.fromTo(img, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: prev ? 0.2 : 0, ease: "expo.out" });
}

hero.switcher.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (btn) choose(btn.dataset.id);
});
renderSwitcher();
phone.addEventListener("change", renderSwitcher);

/* ---- The page-load sequence: ≤1.8s total, non-blocking -----------------------
   0.0  the wordmark fades in (0.4s)
   0.4  its red dot drops into place from 14px above, like the sun coming up (0.7s)
   0.4  the leaves fade in (1.2s, komorebi.js)
   0.45 the H1 lines rise (desktop/tablet only; phones paint the H1 at once for LCP)
   The logo moment happens once, never loops, and is skipped under reduced motion. */
const introStart = performance.now();
const since = (t) => Math.max(0, t - (performance.now() - introStart) / 1000);

function logoMoment() {
  const root = document.documentElement;
  if (!root.classList.contains("logo-intro")) return;
  const brand = document.querySelector(".site-header .brand");
  const svg = brand?.querySelector("svg");
  const dot = svg?.querySelector(".dot");
  if (!dot) { root.classList.remove("logo-intro"); return; }
  const unitsPerPx = svg.viewBox.baseVal.height / (svg.getBoundingClientRect().height || 44);
  gsap.set(brand, { autoAlpha: 0 });
  gsap.set(dot, { opacity: 0 });
  root.classList.remove("logo-intro");
  gsap.to(brand, { autoAlpha: 1, duration: 0.4, ease: "power1.out" });
  gsap.fromTo(dot, { y: -14 * unitsPerPx }, { y: 0, duration: 0.7, delay: 0.4, ease: "expo.out" });
  gsap.to(dot, { opacity: 1, duration: 0.2, delay: 0.4, ease: "power1.out" });
}

async function intro() {
  logoMoment();
  const root = document.documentElement;
  if (!root.classList.contains("intro")) return;
  await fontsReady;
  const title = document.querySelector(".hero__title");
  trackSplit(SplitText.create(title, {
    type: "lines", mask: "lines", autoSplit: true,
    onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1.0, stagger: 0.12, ease: "expo.out", delay: since(0.45) }),
  }));
  gsap.from([".hero__lead", ".hero__actions"], { autoAlpha: 0, duration: 0.6, delay: since(0.8), stagger: 0.08, ease: "power1.out" });
  gsap.from("[data-stage-rise]", {
    y: 30, autoAlpha: 0, filter: "brightness(0.93) saturate(0.85)", duration: 1.2, delay: since(0.5), ease: "komorebi",
    clearProps: "filter",
  });
  gsap.from(hero.switcher, { autoAlpha: 0, duration: 0.6, delay: since(1.0) });
  root.classList.remove("intro");   // from() tweens hold the hidden states now
}
intro();

/* ---- The 3D stage: after first paint, when idle, only where it helps ---------- */
function loadStage() {
  if (!wantsWebGL()) {
    // Fallback: poster stays; the switcher drives the image stage.
    return;
  }
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    idle(async () => {
      try {
        const { createStage } = await import("../three/viewer.js");
        const stage = await createStage(hero.stageEl, { productId: hero.current, interactive: true });
        hero.stage3d = stage;
        window.__jiaiStage = stage;   // devtools handle
        if (hero.current !== stage.productId) stage.setProduct(hero.current);
        hero.stageEl.classList.add("is-3d");
        hero.stageEl.tabIndex = 0;
        hero.stageEl.setAttribute("role", "group");
        hero.stageEl.setAttribute("aria-roledescription", "3D viewer");
        hero.stageEl.setAttribute("aria-label", `${productById(hero.current).fullName}. Use the left and right arrow keys to turn it.`);
        stage.intro({ duration: 1.2 });
        if (!hero.still.hidden) gsap.to(hero.still, { autoAlpha: 0, duration: 0.6, onComplete: () => { hero.still.hidden = true; } });
        showHint();
        hero.stageEl.addEventListener("stage:lost", () => {
          hero.stage3d = null;
          hero.stageEl.classList.remove("is-3d");      // the poster fades back in
          hero.stageEl.removeAttribute("tabindex");
          hero.hint.hidden = true;
        }, { once: true });
      } catch (err) {
        console.warn("3D stage unavailable, keeping the still image.", err);
      }
    });
  });
  io.observe(hero.stageEl);
}
function showHint() {
  const h = hero.hint;
  h.hidden = false;
  gsap.fromTo(h, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 0.8 });
  const hide = () => gsap.to(h, { autoAlpha: 0, duration: 0.6, onComplete: () => { h.hidden = true; } });
  hero.stageEl.addEventListener("stage:drag", hide, { once: true });
  hero.stageEl.addEventListener("keydown", (e) => { if (e.key.startsWith("Arrow")) hide(); }, { once: true });
}
if (document.readyState === "complete") loadStage();
else window.addEventListener("load", loadStage, { once: true });


/* ==========================================================================
   8.2 THE SHELF
   ========================================================================== */
function initShelf() {
  renderShelf(document.querySelector("[data-shelf]"), visibleProducts());
}

/* ==========================================================================
   8.3 A DAY WITH JIAI
   ========================================================================== */
function initRitual() {
  const ritual = document.querySelector("#ritual");
  const panels = gsap.utils.toArray(".ritual__panel", ritual);
  const WASH = ["#FFFDF7", "#FFFFFF", "#FFF4EE", "#F4F6FB"];
  const washEl = ritual.querySelector("[data-ritual-wash]");
  const fillEl = ritual.querySelector("[data-ritual-fill]");
  const stops = gsap.utils.toArray("[data-stop]", ritual);
  const washAt = gsap.utils.interpolate(WASH);

  function markStop(i) {
    stops.forEach((s, k) => s.classList.toggle("is-active", k === i));
  }

  mm.add(MQ.desktop, () => {
    ritual.classList.add("ritual--horizontal");
    const track = ritual.querySelector("[data-ritual-track]");
    const distance = () => track.scrollWidth - window.innerWidth;

    const slide = gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: "[data-ritual-pin]", pin: true, scrub: 1, start: "top top",
        end: () => `+=${distance()}`, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate(self) {
          const i = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
          setTimeOfDay(panels[i].dataset.time);
          markStop(i);
          washEl.style.backgroundColor = washAt(self.progress);
          fillEl.style.transform = `scaleX(${self.progress})`;
        },
        onEnter: () => setTimeOfDay("morning"),
        onLeave: () => setTimeOfDay("day"),
        onLeaveBack: () => setTimeOfDay("morning"),
      },
    });
    markStop(0);

    // Counter-parallax: each product drifts against the track (±60px).
    panels.forEach((panel) => {
      gsap.fromTo(panel.querySelector("[data-ritual-product] img"), { x: -60 }, {
        x: 60, ease: "none",
        scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
      });
    });

    return () => {
      ritual.classList.remove("ritual--horizontal");
      washEl.style.backgroundColor = "";
      fillEl.style.transform = "";
    };
  });

  mm.add("(max-width: 991.98px), (prefers-reduced-motion: reduce)", () => {
    panels.forEach((panel, i) => {
      panel.style.setProperty("--panel-wash", WASH[i % WASH.length]);
      ScrollTrigger.create({
        trigger: panel, start: "top 60%", end: "bottom 40%",
        onEnter: () => setTimeOfDay(panel.dataset.time),
        onEnterBack: () => setTimeOfDay(panel.dataset.time),
      });
    });
    ScrollTrigger.create({ trigger: ritual, start: "top 60%", end: "bottom 40%",
      onLeave: () => setTimeOfDay("day"), onLeaveBack: () => setTimeOfDay("morning") });
  });
}

/* ==========================================================================
   8.4 ONE ORIGIN
   ========================================================================== */
function initOneOrigin() {
  const oo = document.querySelector("#one-origin");
  const range = oo.querySelector("[data-range]");
  const origin = originById(brandById("one-origin")?.originId || "leh-ladakh");
  applyRidgeColours(oo);
  if (origin) {
    countCoords({ coordsEl: oo.querySelector("[data-coords]"), altEl: oo.querySelector("[data-altitude]"),
      lat: origin.lat, lon: origin.lon, altitude: altitudeNumber(origin.altitude), trigger: range });
  }
  mountRange(range, { colours: false });
  mountBranch(oo.querySelector("[data-branch]"));
}

/* ==========================================================================
   8.5 THE HOUSE OF JIAI
   ========================================================================== */
function initHouse() {
  const houseList = document.querySelector("[data-house-list]");
  const brands = visibleBrands();
  houseList.innerHTML = brands.map((b) => {
    const products = productsOfBrand(b.id);
    const live = b.status === "live";
    const meta = live
      ? `${escapeHTML(b.category)} <span class="num">·</span> <span class="num">${products.length}</span> ${products.length === 1 ? "product" : "products"}`
      : `${escapeHTML(b.category)} <span class="num">·</span> Arriving soon`;
    const lead = products[0];
    return `
      <li>
        <a class="house__row" href="${live ? brandURL(b) : "#letters"}" data-preview="${lead ? escapeHTML(standImage(lead)) : ""}">
          <span class="house__name">${typeset(b.name)}</span>
          <span class="house__meta">${meta}</span>
        </a>
      </li>`;
  }).join("");

  if (finePointer && !reduced) {
    const preview = document.querySelector("[data-house-preview]");
    const pimg = preview.querySelector("img");
    const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });
    const rTo = gsap.quickTo(preview, "rotation", { duration: 0.6, ease: "power3" });
    gsap.set(preview, { xPercent: -50, yPercent: -55 });
    let lastX = 0, visible = false;
    let preloaded = false;
    houseList.addEventListener("pointerenter", () => {
      if (preloaded) return;
      preloaded = true;
      houseList.querySelectorAll("[data-preview]").forEach((a) => { if (a.dataset.preview) new Image().src = a.dataset.preview; });
    });
    houseList.addEventListener("pointermove", (e) => {
      const row = e.target.closest(".house__row");
      const src = row?.dataset.preview;
      if (!src) { if (visible) { visible = false; gsap.to(preview, { autoAlpha: 0, scale: 0.92, duration: 0.4 }); } return; }
      if (!pimg.src.endsWith(src)) pimg.src = src;
      if (!visible) {
        visible = true;
        gsap.set(preview, { x: e.clientX, y: e.clientY });
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "komorebi" });
      }
      xTo(e.clientX);
      yTo(e.clientY);
      rTo(gsap.utils.clamp(-9, 9, (e.clientX - lastX) * 0.6));   // tilt from cursor velocity
      lastX = e.clientX;
    });
    houseList.addEventListener("pointerleave", () => {
      visible = false;
      gsap.to(preview, { autoAlpha: 0, scale: 0.92, duration: 0.4 });
      rTo(0);
    });
  }
}

/* ==========================================================================
   8.6 L’ARRIVÉ: THE RUSH
   ========================================================================== */
function initArrived() {
  const arrived = document.querySelector("[data-arrived]");
  const rushEl = arrived.querySelector("[data-rush]");
  const titleEl = arrived.querySelector("[data-arrived-title]");
  const rand = gsap.utils.random;
  const LINES = Array.from({ length: 22 }, () => {
    const el = document.createElement("span");
    el.className = "rush__line";
    const len = rand(80, 400, 1);
    el.style.cssText = `top:${rand(8, 92, 0.1)}%;width:${len}px;height:${rand([1, 1, 2])}px;opacity:${rand(0.3, 0.6, 0.01)}`;
    rushEl.appendChild(el);
    return { el, len, speed: rand(90, 320), x: rand(0, 1) };
  });

  function placeStatic() {
    const w = rushEl.clientWidth;
    LINES.forEach((l) => gsap.set(l.el, { x: l.x * w }));
  }

  if (reduced) {
    placeStatic();
  } else {
    let titleAnim = null, revealed = false;
    fontsReady.then(() => {
      trackSplit(SplitText.create(titleEl, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit(self) {
          titleAnim = gsap.from(self.lines, { yPercent: 105, duration: 1.1, stagger: 0.12, ease: "expo.out", paused: !revealed });
          if (revealed) titleAnim.progress(1);
          return titleAnim;
        },
      }));
    });
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      titleAnim?.play();
    };

    let factor = 1, still = false, running = false;
    const w = () => rushEl.clientWidth;
    LINES.forEach((l) => { l.x = l.x * w(); });
    const tick = (_, dt) => {
      const vel = Math.abs(watch.getVelocity());
      const target = still ? 0 : 1 + Math.min(5, vel / 500);
      factor += (target - factor) * (still ? 0.035 : 0.12);
      if (still && factor < 0.01) factor = 0;
      const width = w();
      LINES.forEach((l) => {
        l.x -= l.speed * factor * (dt / 1000);
        if (l.x < -l.len) l.x = width + rand(0, 200);
        l.el.style.transform = `translate3d(${l.x}px,0,0)`;
      });
    };
    const run = (yes) => {
      if (yes === running) return;
      running = yes;
      yes ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
    };
    // Stream while the section is on screen.
    const watch = ScrollTrigger.create({ trigger: arrived, start: "top bottom", end: "bottom top", onToggle: (s) => run(s.isActive) });

    // "Fully in view": while the sticky stage is held (desktop), or well inside the viewport (mobile).
    mm.add("(min-width: 992px)", () => {
      ScrollTrigger.create({ trigger: arrived, start: "top top", end: "bottom bottom",
        onToggle: (s) => { still = s.isActive; if (still) reveal(); } });
    });
    mm.add("(max-width: 991.98px)", () => {
      ScrollTrigger.create({ trigger: arrived, start: "top 15%", end: "bottom 60%",
        onToggle: (s) => { still = s.isActive; if (still) reveal(); } });
    });
  }
}

/* ==========================================================================
   8.7 STORY: the seal stamps in once
   ========================================================================== */
function initStory() {
  const seal = document.querySelector("[data-stamp]");
  if (seal && !reduced) {
    gsap.timeline({ scrollTrigger: { trigger: seal, start: "top 85%", once: true } })
      .fromTo(seal, { scale: 1.25, autoAlpha: 0, filter: "drop-shadow(0px 1px 0px rgba(43,43,43,0.55))" },
        { scale: 1, autoAlpha: 1, duration: 0.5, ease: "power3.in" })
      .to(seal, { filter: "drop-shadow(0px 1px 0px rgba(43,43,43,0))", duration: 0.7, ease: "power1.out" });
  }
}

/* ==========================================================================
   Shared reveals: headlines by mask, body copy by opacity only
   ========================================================================== */
function initReveals() {
  fontsReady.then(() => {
    document.querySelectorAll("[data-reveal-lines]").forEach((el) => revealLines(el));
  });
  appear("[data-appear]");
}

/* Below-the-fold sections are set up one per task, yielding in between,
   so first input is never stuck behind a long block of layout measuring. */
(async () => {
  for (const init of [initShelf, initRitual, initOneOrigin, initHouse, initArrived, initStory, initReveals]) {
    await yieldToMain();
    init();
  }
})();

/* Deep links (index.html#house from another page) land after pins are measured. */
window.addEventListener("load", () => {
  if (!location.hash) return;
  const target = document.querySelector(location.hash);
  if (!target) return;
  ScrollTrigger.refresh();
  requestAnimationFrame(() => window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 24));
});
