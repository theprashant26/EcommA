/* ==========================================================================
   format.js: pure helpers shared by every page. No DOM side effects.
   ========================================================================== */
import { CONFIG } from "../data/config.js";
import { BRANDS } from "../data/brands.js";
import { PRODUCTS } from "../data/products.js";
import { ORIGINS, BATCHES } from "../data/origins.js";

/* ---- Money --------------------------------------------------------------- */
const money = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0,
});
export const formatPrice = (n) => money.format(n);

/* ---- Text ---------------------------------------------------------------- */
export function escapeHTML(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Escape for HTML and set the º of "Nº" in the body face (Shippori Mincho draws º as a plain o). */
export const typeset = (s = "") => escapeHTML(s).replace(/Nº/g, 'N<span class="numero">º</span>');

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());

/* ---- Coordinates (tabular numerals are applied in CSS) --------------------- */
export function formatCoord(value, axis, digits = 2) {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  return `${Math.abs(value).toFixed(digits)}° ${hemi}`;
}
export const formatLatLon = (o, digits = 2) =>
  `${formatCoord(o.lat, "lat", digits)}, ${formatCoord(o.lon, "lon", digits)}`;

/* ---- Data lookups ---------------------------------------------------------- */
export const brandById = (id) => BRANDS.find((b) => b.id === id);
export const productById = (id) => PRODUCTS.find((p) => p.id === id);
export const originById = (id) => ORIGINS[id];
export const productsOfBrand = (brandId) => PRODUCTS.filter((p) => p.brand === brandId);

/** Brands that should appear in menus and lists (teasers only when the client allows). */
export const visibleBrands = () => BRANDS.filter((b) =>
  b.status === "live" || b.status === "coming" || (b.status === "teaser" && CONFIG.showComingBrands));

/** Products whose brand is visible. */
export const visibleProducts = () => {
  const ids = new Set(visibleBrands().map((b) => b.id));
  return PRODUCTS.filter((p) => ids.has(p.brand));
};

export const canBuy = (p) => !!p && !p.comingSoon && CONFIG.showPrices;

/* ---- Rituals (the four times of day) ---------------------------------------- */
export const RITUALS = [
  { id: "morning", label: "Morning", kanji: "朝" },
  { id: "day",     label: "Day",     kanji: "昼" },
  { id: "evening", label: "Evening", kanji: "夕" },
  { id: "night",   label: "Night",   kanji: "夜" },
];

/* ---- URLs ------------------------------------------------------------------- */
export const productURL = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
export const brandURL = (b) => `brand.html?b=${encodeURIComponent(b.id)}`;
export const ritualURL = (r) => `shop.html?ritual=${encodeURIComponent(r.id)}`;

/* ---- Images ------------------------------------------------------------------ */
/* Every product .png in /assets/products has a .webp sibling; always serve the webp. */
export const toWebp = (src = "") =>
  src.startsWith("assets/products/") ? src.replace(/\.png$/i, ".webp") : src;

/* Intrinsic sizes so every <img> gets width/height and never shifts layout. */
const SIZES = {
  "cleanser-cutout": [836, 2014], "cleanser-hero": [1150, 2047], "cleanser-angle": [1150, 2062], "cleanser-back": [857, 2006],
  "lotion-cutout": [836, 2014],   "lotion-hero": [1150, 2047],   "lotion-angle": [1150, 2062],   "lotion-back": [857, 2006],
  "larrive-cutout-light": [557, 1143], "larrive-cutout": [557, 1143], "larrive-campaign": [1024, 1536],
  "perfume-02-placeholder": [557, 1143],
};
export function imageSize(src = "") {
  const key = src.split("/").pop().replace(/\.(png|webp|jpe?g)$/i, "");
  return SIZES[key] || [800, 1600];
}

/** The best "standing product" image for small thumbnails and shelves. */
export const cutoutOf = (p) => toWebp(p.images?.cutout || p.images?.hero || "");

/** <img> markup with intrinsic size, lazy by default. */
export function imgTag(src, alt, { cls = "", lazy = true, extra = "" } = {}) {
  const [w, h] = imageSize(src);
  return `<img src="${escapeHTML(toWebp(src))}" alt="${escapeHTML(alt)}" width="${w}" height="${h}"` +
    `${cls ? ` class="${cls}"` : ""}${lazy ? ' loading="lazy"' : ""} decoding="async"${extra ? " " + extra : ""}>`;
}

/** Meaningful alt text, e.g. "One Origin Face Cleanser, 100 ml tube". */
export function altFor(p) {
  const kind = p.model ? "tube" : "bottle";
  return p.size && p.size !== "TBC" ? `${p.fullName}, ${p.size} ${kind}` : `${p.fullName}, ${kind}`;
}

/* ---- Environment ---------------------------------------------------------------- */
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- Price (quiet, and only where the story has been told) -------------------- */
/** "₹649", or "Price at launch" while CONFIG.showPrices is off, or "Arriving soon". */
export function priceText(p) {
  if (!p) return "";
  if (p.comingSoon) return "Arriving soon";
  if (!CONFIG.showPrices) return "Price at launch";
  return formatPrice(p.price);
}

/* ---- Origin links: a tube's batch page when we have one, else the place -------- */
export function originURL(originId, productId) {
  const batch = Object.entries(BATCHES).find(([, b]) => b.productId === productId && b.originId === originId)
    || Object.entries(BATCHES).find(([, b]) => b.originId === originId);
  return batch ? `origin.html?batch=${encodeURIComponent(batch[0])}` : `origin.html?origin=${encodeURIComponent(originId)}`;
}

/* ---- Document head for data-rendered pages ------------------------------------------ */
export function setHead({ title, description, canonical }) {
  if (title) document.title = title;
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
  set('meta[name="description"]', "content", description);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", description);
  if (canonical) {
    const base = document.querySelector('link[rel="canonical"]')?.href.replace(/[^/]*$/, "") || "";
    set('link[rel="canonical"]', "href", base + canonical);
    set('meta[property="og:url"]', "content", base + canonical);
  }
}

/** One-line summary for meta descriptions (≤155 chars, no mid-word cut). */
export function summary(text = "", max = 155) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,;:.]$/, "") + "…";
}
