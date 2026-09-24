/* ==========================================================================
   views/origin-view.js: the QR landing page's markup (§9.4), mobile-first.
     origin.html?batch=CODE  → the tube's journey (default: OO-LDK-2609-01)
     origin.html?origin=ID   → a place, when there is no batch (e.g. Paris)
     unknown code            → a gentle "we couldn't find it" with ways on
   Rendered early (async module, no GSAP); pages/origin.js adds the motion.
   ========================================================================== */
import { ORIGINS, BATCHES } from "../data/origins.js";
import { BRANDS } from "../data/brands.js";
import {
  productById, originById, visibleProducts, escapeHTML, typeset, formatLatLon, productURL, setHead, summary,
} from "../core/format.js";
import { fillShelf, shelfShellHTML } from "./blocks.js";

export const DEFAULT_BATCH = "OO-LDK-2609-01";

const main = document.querySelector("[data-origin-page]");
const params = new URLSearchParams(location.search);
const askedBatch = params.get("batch");
const askedOrigin = params.get("origin");

export const code = askedBatch ?? (askedOrigin ? null : DEFAULT_BATCH);
export const batch = code ? BATCHES[code.toUpperCase()] || BATCHES[code] : null;
export const originId = batch ? batch.originId : askedOrigin;
export const origin = originId ? originById(originId) : null;
export const mode = batch && origin ? "batch" : !code && origin ? "place" : "unknown";

/* ---- Small helpers ------------------------------------------------------------------ */
const toDate = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const longDate = (iso) => (iso ? toDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
const monthYear = (iso) => (iso ? toDate(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "");
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
const altitudeParts = (alt = "") => ({ prefix: alt.match(/^[^\d]*/)[0], number: alt.replace(/[^\d,]/g, "") });
const brandsFrom = (id) => BRANDS.filter((b) => b.originId === id && b.status === "live");
const hasRidges = (id) => id === "leh-ladakh";

/* The QR code is the whole reason someone is here: say where they are first. */
function heroHTML({ eyebrow, title, extra = "" }) {
  const alt = origin.altitude ? altitudeParts(origin.altitude) : null;
  return `
    <section class="og-hero" aria-labelledby="og-title">
      <span class="kanji-marker og-hero__marker" aria-hidden="true">源</span>
      <div class="container-k og-hero__copy">
        <p class="og-hero__eyebrow">${eyebrow}</p>
        <h1 id="og-title" class="og-hero__title">${title}</h1>
        <p class="og-hero__place">${escapeHTML(origin.name)}<span>, ${escapeHTML(origin.country)}</span></p>
        <p class="og-hero__coords">
          <span class="num" data-og-coords>${formatLatLon(origin)}</span>
          ${alt ? `<span class="num">Altitude ${escapeHTML(alt.prefix)}<span data-og-alt>${escapeHTML(alt.number)}</span> m</span>` : ""}
        </p>
        ${extra}
      </div>
      ${hasRidges(originId)
        ? `<div class="og-hero__range range" data-og-range aria-hidden="true"></div>`
        : `<div class="og-hero__rule" aria-hidden="true"></div>`}
    </section>`;
}

/* ---- The journey: a real sequence, so a real timeline ------------------------------------ */
function journeyHTML(p) {
  const place = batch.field || origin.name;
  const pressedAfter = batch.harvestDate && batch.pressedDate ? daysBetween(batch.harvestDate, batch.pressedDate) : null;
  const sinceHarvest = batch.harvestDate ? daysBetween(batch.harvestDate, todayISO()) : null;
  const stops = [
    { title: "Grown", when: batch.grownSeason || "", text: `Ripening on the slopes of ${place}${origin.altitude ? `, at ${origin.altitude}` : ""}.` },
    { title: "Harvested", when: longDate(batch.harvestDate), text: `Picked by hand by ${batch.harvestedBy}.` },
    { title: "Pressed", when: longDate(batch.pressedDate), text: pressedAfter != null ? `Pressed ${pressedAfter === 1 ? "one day" : `${pressedAfter} days`} after picking.` : "Pressed after picking." },
    { title: "Formulated", when: longDate(batch.formulatedDate), text: `Made into ${p ? p.fullName : "your tube"}.` },
    { title: "Filled", when: longDate(batch.filledDate), text: `Filled, sealed and given the code on your tube: ${code.toUpperCase()}.` },
    { title: "With you", when: "Today", text: sinceHarvest != null && sinceHarvest > 0 ? `In your hands, ${sinceHarvest} days after it was picked.` : "In your hands." },
  ];
  return `
    <section class="section og-journey" aria-labelledby="journey-title">
      <div class="container-k">
        <h2 id="journey-title" class="og-h2">The journey.</h2>
        <div class="journey" data-journey>
          <span class="journey__rail" aria-hidden="true"><span class="journey__fill" data-journey-fill></span></span>
          <ol class="journey__stops">
            ${stops.map((s) => `
            <li class="journey__stop">
              <span class="journey__dot" aria-hidden="true"></span>
              <p class="journey__when num">${escapeHTML(s.when || "Date to come")}</p>
              <h3 class="journey__title">${escapeHTML(s.title)}</h3>
              <p class="journey__text">${escapeHTML(s.text)}</p>
            </li>`).join("")}
          </ol>
        </div>
      </div>
    </section>`;
}

/* ---- Photo slots: framed, captioned, waiting for the client's own photographs ------------- */
function photosHTML(slots, { heading, lead }) {
  // TODO(client): real photos from the farm — do not use stock photography.
  // Add them to the batch's `photos` in js/data/origins.js, e.g. photos:{ field:"assets/photos/field.jpg" }.
  const art = hasRidges(originId)
    ? `<img class="photo-slot__art" src="assets/illustrations/ladakh-range.png" alt="" width="2400" height="900" loading="lazy" decoding="async">`
    : `<img class="photo-slot__art photo-slot__art--map" src="assets/map/map-dots.png" alt="" width="2400" height="1517" loading="lazy" decoding="async">`;
  const figures = slots.map((s) => {
    const photo = (batch?.photos || {})[s.key];
    return `
      <figure class="photo-slot${photo ? " has-photo" : ""}" data-photo="${escapeHTML(s.key)}">
        <div class="photo-slot__frame">
          ${photo
            ? `<img class="photo-slot__img" src="${escapeHTML(photo)}" alt="${escapeHTML(s.caption)}" loading="lazy" decoding="async">`
            : `${art}<span class="photo-slot__mark" aria-hidden="true">源</span>`}
        </div>
        <figcaption class="photo-slot__caption">${escapeHTML(s.caption)}</figcaption>
      </figure>`;
  }).join("");
  return `
    <section class="section og-photos" aria-labelledby="photos-title">
      <div class="container-k">
        <h2 id="photos-title" class="og-h2">${escapeHTML(heading)}</h2>
        <p class="og-lead">${escapeHTML(lead)}</p>
        <div class="og-photos__grid">${figures}</div>
      </div>
    </section>`;
}

/* ---- The map: dot matrix + routes, drawn in origin.js ------------------------------------- */
function mapHTML(route, { heading, text }) {
  return `
    <section class="section og-map" aria-labelledby="map-title">
      <div class="container-k">
        <h2 id="map-title" class="og-h2">${escapeHTML(heading)}</h2>
        <p class="og-lead">${escapeHTML(text)}</p>
        <figure class="routemap" data-routemap data-route="${escapeHTML(route)}">
          <div class="routemap__canvas" data-routemap-canvas>
            <img class="routemap__dots" src="assets/map/map-dots.png" alt="" width="2400" height="1517" loading="lazy" decoding="async">
          </div>
        </figure>
      </div>
    </section>`;
}

/* ---- Batch facts --------------------------------------------------------------------------- */
function factsHTML(p) {
  const rows = [
    ["Product", p ? p.fullName : "—"],
    ["Batch", code.toUpperCase()],
    ["Origin", `${origin.name}, ${origin.country}`],
    ["Field", batch.field],
    ["Ingredient", origin.ingredient],
    ["Harvested by", batch.harvestedBy],
    ["Harvested", longDate(batch.harvestDate)],
    ["Pressed", longDate(batch.pressedDate)],
    ["Formulated", longDate(batch.formulatedDate)],
    ["Filled", longDate(batch.filledDate)],
  ].filter(([, v]) => v);
  const lab = batch.labReport && batch.labReport !== "#"
    ? `<a class="link-draw" href="${escapeHTML(batch.labReport)}">Read the lab report</a>`
    : `<span class="t-muted">Lab report available soon</span>`;   // TODO(client): lab report link
  return `
    <section class="section og-facts" aria-labelledby="facts-title">
      <div class="container-k">
        <h2 id="facts-title" class="og-h2">Batch facts.</h2>
        <table class="facts">
          <caption class="visually-hidden">Facts for batch ${escapeHTML(code.toUpperCase())}</caption>
          <tbody>
            ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHTML(k)}</th><td class="num">${escapeHTML(v)}</td></tr>`).join("")}
            <tr><th scope="row">Lab report</th><td>${lab}</td></tr>
          </tbody>
        </table>
        ${p ? `<a class="btn-ink og-facts__cta" href="${productURL(p)}">Discover the ${escapeHTML(p.name.toLowerCase())}</a>` : ""}
      </div>
    </section>`;
}

/* ==========================================================================
   Render (once)
   ========================================================================== */
function renderBatch() {
  const p = productById(batch.productId);
  const place = (batch.field || origin.name).split(",").pop().trim();
  const when = monthYear(batch.harvestDate);
  setHead({
    title: `Batch ${code.toUpperCase()} | Jiai Life`,
    description: summary(`Your ${p ? p.fullName : "tube"} began in ${origin.name}. See the field, the harvest and the day it was picked.`),
    canonical: `origin.html?batch=${encodeURIComponent(code.toUpperCase())}`,
  });
  main.innerHTML = [
    heroHTML({
      eyebrow: `Batch <span class="num">${escapeHTML(code.toUpperCase())}</span>`,
      title: "Your tube began here.",
      extra: `<p class="og-hero__ingredient">${escapeHTML(origin.ingredient || "")}${origin.season ? ` · ${escapeHTML(origin.season)}` : ""}</p>`,
    }),
    journeyHTML(p),
    photosHTML([
      { key: "field", caption: `The field, ${place}, ${when}` },
      { key: "harvest", caption: `The harvest, ${place}, ${when}` },
      { key: "hands", caption: `The hands, ${place}, ${when}` },
    ], { heading: "From the valley.", lead: "Photographs from this harvest, taken where it grew." }),
    // TODO(client): confirm the route (field → New Delhi) and this sentence
    mapHTML("leh", { heading: `From ${origin.name.split(",")[0]} to you.`, text: `From the valley, the harvest travels to New Delhi, where it becomes your ${p ? p.name.toLowerCase() : "tube"}.` }),
    factsHTML(p),
  ].join("");
}

function renderPlace() {
  const brands = brandsFrom(originId);
  const names = brands.map((b) => b.name).join(" and ") || "our house";
  const products = visibleProducts().filter((x) => x.originId === originId);
  setHead({
    title: `${origin.name} | Jiai Life`,
    description: summary(`Where ${names} began: ${origin.text}`),
    canonical: `origin.html?origin=${encodeURIComponent(originId)}`,
  });
  main.innerHTML = [
    heroHTML({ eyebrow: "Origin", title: `Where ${typeset(names)} began.`, extra: `<p class="og-hero__ingredient">${escapeHTML(origin.text)}</p>` }),
    // TODO(client): real photographs from Paris; no stock photography
    photosHTML([
      { key: "atelier", caption: `The atelier, ${origin.name}` },
      { key: "city", caption: `The city, ${origin.name}` },
    ], { heading: `From ${origin.name}.`, lead: "Photographs from where it was composed." }),
    mapHTML("paris", { heading: `From ${origin.name} to you.`, text: `Composed in ${origin.name}, then brought to India.` }),  // TODO(client): confirm
    products.length ? `
      <section class="section og-products" aria-labelledby="og-products-title">
        <div class="container-k">
          <h2 id="og-products-title" class="og-h2">Made from here.</h2>
          ${shelfShellHTML()}
        </div>
      </section>` : "",
  ].join("");
  if (products.length) fillShelf(main.querySelector("[data-shelf]"), products);
}

function renderUnknown() {
  setHead({ title: "Trace your origin | Jiai Life", description: "Scan the code on your tube to see where it began." });
  const places = Object.entries(ORIGINS).map(([id, o]) => `<li><a class="link-draw" href="origin.html?origin=${encodeURIComponent(id)}">${escapeHTML(o.name)}, ${escapeHTML(o.country)}</a></li>`).join("");
  main.innerHTML = `
    <section class="section page-top og-unknown" aria-labelledby="og-title">
      <div class="container-k">
        <h1 id="og-title" class="t-h2">We couldn’t find that code.</h1>
        <p class="og-lead">${code ? `“${escapeHTML(code)}” isn’t a batch we recognise yet. ` : ""}Check the code printed beside the QR on your tube, or visit one of our origins.</p>
        <ul class="og-unknown__list">${places}</ul>
        <p><a class="btn-ink" href="origin.html?batch=${DEFAULT_BATCH}">See an example journey</a></p>
      </div>
    </section>`;
}

if (main && !main.dataset.rendered) {
  main.dataset.rendered = "true";
  if (mode === "batch") renderBatch();
  else if (mode === "place") renderPlace();
  else renderUnknown();
}
