/* ==========================================================================
   illustrations.js: the inline SVG art (§5): Ladakh ridges and the
   sea-buckthorn branch, plus counting coordinates. Used by the home One
   Origin band, the PDP, brand pages and (later) the origin page.
   All SVGs are fetched only when their host nears the viewport.
   ========================================================================== */
import { prefersReducedMotion, originById } from "./format.js";
export { originBlockHTML } from "../views/blocks.js";
import { whenNear } from "./motion.js";

const { gsap } = window;

/* Update 01: neutral grey ridges and a red sun (the logo's dot) at .9 opacity. */
export const RIDGE_COLOURS = {
  "--ridge-0": "#E9E9E7", "--ridge-1": "#D6D6D3", "--ridge-2": "#B9B9B5",
  "--ridge-3": "#94948F", "--ridge-4": "#6E6E69", "--sun": "#B5473A",
};
const SPEEDS = [0.2, 0.4, 0.6, 0.8, 1.0];   // back ridge → front ridge

export const RANGE_URL = "assets/illustrations/ladakh-range.svg";
export const BRANCH_URL = "assets/illustrations/sea-buckthorn.svg";

const svgCache = new Map();
const fetchSVG = (url) => {
  if (!svgCache.has(url)) {
    svgCache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.text(); }));
    svgCache.get(url).catch(() => svgCache.delete(url));   // let a later attempt retry
  }
  return svgCache.get(url);
};

/* Decorative art is optional: if it can't load, the section simply goes without it. */
const quietly = (fn) => async () => { try { await fn(); } catch (err) { console.warn("Illustration skipped:", err.message); } };

/** Inline an SVG into host (decorative: its own role/label are removed). */
export async function inlineSVG(url, host) {
  host.insertAdjacentHTML("afterbegin", await fetchSVG(url));
  const svg = host.querySelector("svg");
  svg.removeAttribute("role");
  svg.removeAttribute("aria-label");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

export const applyRidgeColours = (el) => Object.entries(RIDGE_COLOURS).forEach(([k, v]) => el.style.setProperty(k, v));

/* Group each ridge with the snow that follows it, and extend it downward so
   parallax never opens a gap at the bottom. */
function layerRidges(svg) {
  const NS = "http://www.w3.org/2000/svg";
  let group = null;
  const layers = [];
  [...svg.children].forEach((el) => {
    if (el.classList.contains("ridge")) {
      group = document.createElementNS(NS, "g");
      group.setAttribute("class", "range__layer");
      svg.insertBefore(group, el);
      const n = [...el.classList].find((c) => /^ridge-\d$/.test(c)).slice(-1);
      const ext = document.createElementNS(NS, "rect");
      ext.setAttribute("x", "0"); ext.setAttribute("y", "880"); ext.setAttribute("width", "2400"); ext.setAttribute("height", "320");
      ext.setAttribute("fill", `var(--ridge-${n})`);
      group.append(el, ext);
      layers[n] = group;
    } else if (group && el.classList.contains("snow")) {
      group.appendChild(el);
    }
  });
  svg.style.overflow = "visible";
  return layers;
}

/**
 * Mount the Ladakh ridges into `host` when it nears the viewport; each ridge
 * moves at its own speed with scroll (back 0.2 → front 1.0).
 */
export function mountRange(host, { travel = 110, colours = true } = {}) {
  if (!host) return;
  if (colours) applyRidgeColours(host);
  whenNear(host, quietly(async () => {
    const svg = await inlineSVG(RANGE_URL, host);
    svg.classList.add("range__svg");
    const layers = layerRidges(svg);
    if (prefersReducedMotion()) return;
    const st = { trigger: host, start: "top bottom", end: "bottom top", scrub: true };
    layers.forEach((layer, i) => gsap.fromTo(layer, { y: travel * SPEEDS[i] }, { y: -travel * SPEEDS[i], ease: "none", scrollTrigger: st }));
    const sun = svg.querySelector(".sun");
    if (sun) gsap.fromTo(sun, { y: travel / 5 }, { y: -travel / 5, ease: "none", scrollTrigger: st });
  }), "600px 0px 600px 0px");
}

/**
 * Mount the sea-buckthorn branch: the branch draws (DrawSVG, 1.4s), leaves
 * grow from their stems (stagger .04), berries pop in random order (.025).
 */
export function mountBranch(host) {
  if (!host) return;
  whenNear(host, quietly(async () => {
    const svg = await inlineSVG(BRANCH_URL, host);
    if (prefersReducedMotion()) return;
    const leaves = [...svg.querySelectorAll(".leaf")];
    const berries = gsap.utils.shuffle([...svg.querySelectorAll(".berry")]);
    const tl = gsap.timeline({ scrollTrigger: { trigger: host, start: "top 80%", once: true } });
    tl.fromTo(svg.querySelectorAll("#branch path"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.4, ease: "komorebi", stagger: 0.1 });
    leaves.forEach((leaf, i) => {
      // every leaf path starts at its stem point: grow from there
      const m = /M\s*([-\d.]+)[ ,]([-\d.]+)/.exec(leaf.getAttribute("d"));
      const origin = m ? `${m[1]} ${m[2]}` : "50% 100%";
      tl.fromTo(leaf, { scale: 0 }, { scale: 1, svgOrigin: origin, duration: 0.9, ease: "expo.out" }, 0.6 + i * 0.04);
    });
    tl.fromTo(berries, { scale: 0 }, { scale: 1, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.025, ease: "power2.out" }, 1.3);
  }), "600px 0px 600px 0px");
}

/**
 * Count coordinates (and optionally altitude) up from zero when `trigger`
 * enters. The final values are already in the HTML for no-JS / reduced motion.
 */
export function countCoords({ coordsEl, altEl = null, lat, lon, altitude = 0, trigger }) {
  if (!coordsEl || prefersReducedMotion()) return;
  const hemi = (v, pos, neg) => (v >= 0 ? pos : neg);
  const v = { lat: 0, lon: 0, alt: 0 };
  const render = () => {
    coordsEl.textContent = `${Math.abs(v.lat).toFixed(2)}° ${hemi(lat, "N", "S")}, ${Math.abs(v.lon).toFixed(2)}° ${hemi(lon, "E", "W")}`;
    if (altEl) altEl.textContent = Math.round(v.alt).toLocaleString("en-IN");
  };
  render();
  gsap.to(v, { lat, lon, alt: altitude, duration: 1.4, ease: "komorebi", onUpdate: render,
    scrollTrigger: { trigger: trigger || coordsEl, start: "top 80%", once: true } });
}

/** Parse "≈3,500 m" → 3500. */
export const altitudeNumber = (s = "") => Number(String(s).replace(/[^\d.]/g, "")) || 0;

/* ==========================================================================
   The origin block ("Where it's from"): PDP §9.1.5 and brand pages §9.3.
   Ladakh gets a strip of ridges; places without an illustration get a crop
   of the dot-matrix map with a red pin (positions from map/pins.json).
   ========================================================================== */
let pinsPromise = null;
const loadPins = () => (pinsPromise ||= fetch("assets/map/pins.json").then((r) => r.json()).catch(() => ({})));
const pinFor = (pins, originId) => pins[originId] || pins[String(originId).split("-")[0]];
export function mountOriginBlock(root) {
  const block = root?.querySelector("[data-origin-block]") || (root?.matches?.("[data-origin-block]") ? root : null);
  if (!block) return;
  const originId = block.dataset.originBlock;
  const o = originById(originId);
  if (!o) return;
  countCoords({ coordsEl: block.querySelector("[data-ob-coords]"), altEl: block.querySelector("[data-ob-alt]"),
    lat: o.lat, lon: o.lon, altitude: altitudeNumber(o.altitude), trigger: block });
  const range = block.querySelector("[data-ob-range]");
  if (range) mountRange(range, { travel: 70 });
  const map = block.querySelector("[data-ob-map]");
  if (map) {
    loadPins().then((pins) => {
      const pin = pinFor(pins, originId);
      if (!pin) return;
      // centre the crop on the pin; the pin sits at the same point of the image
      map.style.setProperty("--xf", String(pin.x_pct / 100));
      map.style.setProperty("--yf", String(pin.y_pct / 100));
      map.classList.add("has-pin");
    });
  }
}
