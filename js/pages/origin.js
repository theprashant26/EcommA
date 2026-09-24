/* ==========================================================================
   origin.js: origin.html (§9.4): behaviour. views/origin-view.js renders the
   page early; this adds the ridges' parallax, the counting coordinates, the
   journey line, and the map (one route drawn through a mask, a pulsing pin).
   ========================================================================== */
import { initMotion, revealLines, appear } from "../core/motion.js";
import { initKomorebi } from "../core/komorebi.js";
import { initHeader } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import { prefersReducedMotion } from "../core/format.js";
import { animateShelf, bindTurn } from "../core/shelf.js";
import { mountRange, countCoords, altitudeNumber, inlineSVG } from "../core/illustrations.js";
import { mode, origin } from "../views/origin-view.js";

const { gsap, ScrollTrigger } = window;
const reduced = prefersReducedMotion();
const main = document.querySelector("[data-origin-page]");
let pinsPromise = null;
const loadPins = () => (pinsPromise ||= fetch("assets/map/pins.json").then((r) => r.json()).catch(() => ({})));

initMotion();
initKomorebi({ stage: "morning" });
initHeader();
initCart();
initSearch();

if (mode !== "unknown") {
  mountRange(main.querySelector("[data-og-range]"), { travel: 80 });
  countCoords({
    coordsEl: main.querySelector("[data-og-coords]"), altEl: main.querySelector("[data-og-alt]"),
    lat: origin.lat, lon: origin.lon, altitude: altitudeNumber(origin.altitude), trigger: main.querySelector(".og-hero"),
  });
  initJourney();
  initMap().catch((err) => console.warn("Map skipped:", err.message));   // the page reads fine without it
  main.querySelectorAll("[data-shelf]").forEach((shelf) => { animateShelf(shelf); bindTurn(shelf); });
  main.querySelectorAll(".og-h2").forEach((el) => revealLines(el));
  appear(main.querySelectorAll(".og-lead, .photo-slot"));
}

/* ---- The journey: a red line grows down the stops as you read ------------------- */
function initJourney() {
  const journey = main.querySelector("[data-journey]");
  if (!journey) return;
  const fill = journey.querySelector("[data-journey-fill]");
  const stops = [...journey.querySelectorAll(".journey__stop")];
  if (reduced) {
    gsap.set(fill, { scaleY: 1 });
    stops.forEach((s) => s.classList.add("is-reached"));
    return;
  }
  gsap.fromTo(fill, { scaleY: 0 }, {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: journey, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
  });
  stops.forEach((stop) => ScrollTrigger.create({
    trigger: stop, start: "top 62%",
    onEnter: () => stop.classList.add("is-reached"),
    onLeaveBack: () => stop.classList.remove("is-reached"),
  }));
}

/* ---- The map ------------------------------------------------------------------------ */

async function initMap() {
  const fig = main.querySelector("[data-routemap]");
  if (!fig) return;
  const canvas = fig.querySelector("[data-routemap-canvas]");
  const route = fig.dataset.route;                        // "leh" | "paris"
  const [svg, pins] = await Promise.all([inlineSVG("assets/map/routes.svg", canvas), loadPins()]);
  svg.classList.add("routemap__routes");
  canvas.appendChild(svg);                                // above the dots

  // Only this origin's route and pins; the others stay out of the picture.
  svg.querySelectorAll(".route").forEach((r) => { if (r.id !== `route-${route}`) r.remove(); });
  svg.querySelectorAll(".pin").forEach((p) => { if (![`pin-${route}`, "pin-delhi"].includes(p.id)) p.remove(); });
  svg.querySelector(`#pin-${route}`)?.classList.add("is-origin");

  // Frame the route: centre between origin and New Delhi (fractions of the map).
  const a = pins[route], b = pins.delhi;
  if (a && b) {
    fig.style.setProperty("--fx", String((a.x_pct + b.x_pct) / 200));
    fig.style.setProperty("--fy", String((a.y_pct + b.y_pct) / 200));
    [[route, a], ["delhi", b]].forEach(([key, pin]) => {
      const label = document.createElement("span");
      label.className = `routemap__label routemap__label--${key}`;
      label.style.left = `${pin.x_pct}%`;
      label.style.top = `${pin.y_pct}%`;
      label.textContent = pin.label;
      canvas.appendChild(label);
    });
  }
  fig.classList.add("is-ready", `routemap--${route}`);

  // The dashed route draws through a solid mask, so its dashes stay intact (§9.4).
  const path = svg.querySelector(`#route-${route}`);
  if (!path) return;
  const NS = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(NS, "defs");
  const mask = document.createElementNS(NS, "mask");
  const reveal = document.createElementNS(NS, "path");
  mask.id = `route-mask-${route}`;
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0"); mask.setAttribute("y", "0"); mask.setAttribute("width", "2400"); mask.setAttribute("height", "1517");
  reveal.setAttribute("d", path.getAttribute("d"));
  reveal.setAttribute("fill", "none");
  reveal.setAttribute("stroke", "#fff");
  reveal.setAttribute("stroke-width", "22");
  reveal.setAttribute("stroke-linecap", "round");
  mask.appendChild(reveal);
  defs.appendChild(mask);
  svg.prepend(defs);
  path.setAttribute("mask", `url(#${mask.id})`);
  if (reduced) return;
  gsap.fromTo(reveal, { drawSVG: "0%" }, {
    drawSVG: "100%", duration: route === "leh" ? 1.6 : 2.4, ease: "komorebi",
    scrollTrigger: { trigger: fig, start: "top 70%", once: true },
  });
}
