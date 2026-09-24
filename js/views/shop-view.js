/* ==========================================================================
   views/shop-view.js: the shop's markup (§9.2): filter chips and the grid,
   rendered as soon as the data arrives (async module, no GSAP). The initial
   ?b= / ?ritual= filter is applied here too, so the first paint is already
   right. pages/shop.js adds Flip filtering, quick view and hover turns.
   ========================================================================== */
import {
  visibleProducts, visibleBrands, productsOfBrand, brandById, productById, escapeHTML, typeset, imgTag,
  cutoutOf, productURL, priceText, RITUALS,
} from "../core/format.js";

const grid = document.querySelector("[data-shop-grid]");
const chipsEl = document.querySelector("[data-shop-filters]");
const countEl = document.querySelector("[data-shop-count]");
export const products = visibleProducts();

/* ---- Filters: All, one per brand that has products, one per ritual ------------ */
export const FILTERS = [
  { key: "all", label: "All", test: () => true },
  ...visibleBrands().filter((b) => productsOfBrand(b.id).length).map((b) => ({
    key: `b:${b.id}`, group: "brand", label: b.name, test: (p) => p.brand === b.id,
  })),
  ...RITUALS.filter((r) => products.some((p) => p.ritual === r.id)).map((r) => ({
    key: `r:${r.id}`, group: "ritual", label: r.label, kanji: r.kanji, ritual: r.id, test: (p) => p.ritual === r.id,
  })),
];

const params = new URLSearchParams(location.search);
const wanted = params.get("b") ? `b:${params.get("b")}` : params.get("ritual") ? `r:${params.get("ritual")}` : "all";
export const initialFilter = FILTERS.some((f) => f.key === wanted) ? wanted : "all";

/** Show only the cards that pass filter `key`; returns how many are shown. */
export function showOnly(key, cards) {
  const f = FILTERS.find((x) => x.key === key) || FILTERS[0];
  let shown = 0;
  cards.forEach((card) => {
    const on = f.test(productById(card.dataset.id));
    card.hidden = !on;
    if (on) shown++;
  });
  if (countEl) countEl.textContent = shown === 1 ? "1 product" : `${shown} products`;
  if (grid) grid.dataset.empty = shown ? "" : "true";
  chipsEl?.querySelectorAll("[data-filter]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === f.key)));
  return shown;
}

const chip = (f) => `
  <button class="chip" type="button" data-filter="${escapeHTML(f.key)}" aria-pressed="false">
    ${f.kanji ? `<span class="chip__kanji" aria-hidden="true">${f.kanji}</span>` : ""}<span>${typeset(f.label)}</span>
  </button>`;

/* ---- Render (once) -------------------------------------------------------------- */
if (grid && !grid.dataset.rendered) {
  grid.dataset.rendered = "true";
  chipsEl.innerHTML = `
    <div class="chips__group">${chip(FILTERS[0])}</div>
    <div class="chips__group" role="group" aria-label="By brand"><span class="chips__label">Brand</span>${FILTERS.filter((f) => f.group === "brand").map(chip).join("")}</div>
    <div class="chips__group" role="group" aria-label="By ritual"><span class="chips__label">Ritual</span>${FILTERS.filter((f) => f.group === "ritual").map(chip).join("")}</div>`;

  // Each product on its own paper plinth. The first row is on screen at load:
  // those images are eager (the first two at high priority) since one is the LCP.
  grid.innerHTML = products.map((p, i) => {
    const b = brandById(p.brand);
    const img = imgTag(cutoutOf(p), "", { cls: "shelf__img", lazy: i >= 4, extra: i < 2 ? 'fetchpriority="high"' : "" });
    return `
    <li class="shop-card" data-id="${escapeHTML(p.id)}">
      <a class="shop-card__stage" href="${productURL(p)}" tabindex="-1" aria-hidden="true">
        <span class="shop-card__plinth"></span>
        <span class="shelf__shadow"></span>
        <span class="shelf__figure"><span class="shelf__pic">${img}</span></span>
      </a>
      <p class="shelf__brand">${typeset(b?.name || "")}</p>
      <h2 class="shop-card__name"><a href="${productURL(p)}">${typeset(p.name)}</a></h2>
      <p class="shop-card__benefit">${escapeHTML(p.benefit)}</p>
      <p class="shop-card__price num">${escapeHTML(priceText(p))}</p>
      <button class="link-draw shop-card__quick" type="button" data-quick="${escapeHTML(p.id)}" aria-label="Quick view: ${escapeHTML(p.fullName)}">Quick view</button>
    </li>`;
  }).join("");
  showOnly(initialFilter, [...grid.querySelectorAll(".shop-card")]);
}
