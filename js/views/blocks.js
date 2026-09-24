/* ==========================================================================
   views/blocks.js: pure markup shared by several pages (no GSAP, no DOM
   behaviour), so the early "view" modules can render a page before the
   animation libraries have even arrived. Behaviour lives in core/shelf.js
   and core/illustrations.js, which import these.
   ========================================================================== */
import {
  brandById, escapeHTML, typeset, cutoutOf, imgTag, productURL, originById, originURL, formatLatLon,
} from "../core/format.js";

/* ---- Shelf ------------------------------------------------------------------ */
/** The standing product: shadow, figure and (later) the spin overlay. */
export function standHTML(p, { href = productURL(p), eager = false } = {}) {
  return `
    <a class="shelf__stand" href="${href}" tabindex="-1" aria-hidden="true">
      <span class="shelf__shadow"></span>
      <span class="shelf__figure"><span class="shelf__pic">${imgTag(cutoutOf(p), "", { cls: "shelf__img", lazy: !eager })}</span></span>
    </a>`;
}

/** One shelf item: stand, brand, name, benefit and a quiet link. No price (price comes after story). */
export function shelfItemHTML(p, { headingLevel = 3, link = "Discover" } = {}) {
  const b = brandById(p.brand);
  const h = `h${headingLevel}`;
  return `
    <li class="shelf__item" data-id="${escapeHTML(p.id)}">
      ${standHTML(p)}
      <p class="shelf__brand">${typeset(b?.name || "")}</p>
      <${h} class="shelf__name">${typeset(p.name)}</${h}>
      <p class="shelf__benefit">${escapeHTML(p.benefit)}</p>
      <a class="link-draw" href="${productURL(p)}" aria-label="${escapeHTML(link)}: ${escapeHTML(p.fullName)}">${escapeHTML(link)}</a>
    </li>`;
}

/** Fill a shelf with products (markup only; core/shelf.js adds the motion). */
export function fillShelf(shelfEl, products, opts = {}) {
  const row = shelfEl.querySelector("[data-shelf-row]");
  row.innerHTML = products.map((p) => shelfItemHTML(p, opts)).join("");
  shelfEl.style.setProperty("--shelf-count", String(Math.max(1, products.length)));
  return row;
}

/** Markup for the empty shelf container (the line sits at stand height). */
export const shelfShellHTML = (extraClass = "") => `
  <div class="shelf ${extraClass}" data-shelf>
    <ul class="shelf__row" data-shelf-row></ul>
    <span class="shelf__line" data-shelf-line aria-hidden="true"></span>
  </div>`;

/* ---- Origin block ("Where it's from") ----------------------------------------- */
const hasRidges = (originId) => originId === "leh-ladakh";

export function originBlockHTML(originId, { productId = null, heading = "Where it’s from", headingLevel = 2, id = "" } = {}) {
  const o = originById(originId);
  if (!o) return "";
  const h = `h${headingLevel}`;
  const lines = [o.ingredient, o.season].filter(Boolean).map((t) => `<li>${escapeHTML(t)}</li>`).join("");
  return `
    <section class="origin-block section"${id ? ` id="${id}"` : ""} data-origin-block="${escapeHTML(originId)}" aria-labelledby="ob-${escapeHTML(originId)}">
      <span class="kanji-marker section__marker" aria-hidden="true">源</span>
      <div class="container-k">
        <div class="row align-items-center gy-5">
          <div class="col-lg-5">
            <${h} class="origin-block__title" id="ob-${escapeHTML(originId)}">${escapeHTML(heading)}</${h}>
            <p class="origin-block__place">${escapeHTML(o.name)}<span>, ${escapeHTML(o.country)}</span></p>
            <p class="origin-block__coords">
              <span class="num" data-ob-coords>${formatLatLon(o)}</span>
              ${o.altitude ? `<span class="num">Altitude ${escapeHTML(o.altitude.match(/^[^\d]*/)[0])}<span data-ob-alt>${escapeHTML(o.altitude.replace(/[^\d,]/g, ""))}</span> m</span>` : ""}
            </p>
            ${lines ? `<ul class="origin-block__facts">${lines}</ul>` : ""}
            <p class="origin-block__text">${escapeHTML(o.text)}</p>
            <a class="btn-ink" href="${originURL(originId, productId)}">Trace your origin</a>
          </div>
          <div class="col-lg-6 offset-lg-1">
            ${hasRidges(originId)
              ? `<div class="range range--strip" data-ob-range></div>`
              : `<div class="mapcrop" data-ob-map><img src="assets/map/map-dots.png" alt="" width="2400" height="1517" loading="lazy" decoding="async"><span class="mapcrop__pin" aria-hidden="true"></span></div>`}
          </div>
        </div>
      </div>
    </section>`;
}
