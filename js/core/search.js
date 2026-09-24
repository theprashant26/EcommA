/* ==========================================================================
   search.js: full-screen paper overlay, searches PRODUCTS and BRANDS
   client-side as you type. Built on a Bootstrap fullscreen modal, so focus
   trapping and Esc-to-close come for free.
   ========================================================================== */
import {
  visibleBrands, visibleProducts, brandById, productsOfBrand, escapeHTML, typeset, cutoutOf, imgTag, productURL, brandURL, RITUALS,
} from "./format.js";

const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* One flat index, rebuilt from data on every page load. */
function buildIndex() {
  const products = visibleProducts().map((p) => {
    const b = brandById(p.brand);
    const ritual = RITUALS.find((r) => r.id === p.ritual);
    return {
      kind: "product", url: productURL(p), title: p.name, meta: b?.name || "", img: cutoutOf(p),
      hay: norm([p.name, p.fullName, b?.name, b?.category, p.benefit, p.keyIngredient, p.forWho, p.ritualLabel,
        ritual?.label, ...(p.claims || []), ...Object.values(p.notes || {}).flat()].join(" ")),
    };
  });
  const brands = visibleBrands().map((b) => {
    const lead = productsOfBrand(b.id)[0];
    return {
      kind: "brand", url: brandURL(b), title: b.name, meta: b.status === "live" ? b.category : "Arriving soon",
      img: lead ? cutoutOf(lead) : "",
      hay: norm([b.name, b.line, b.category, b.story].join(" ")),
    };
  });
  return [...products, ...brands];
}

function score(item, terms) {
  let s = 0;
  for (const t of terms) {
    if (!item.hay.includes(t)) return 0;
    s += norm(item.title).startsWith(t) ? 3 : norm(item.title).includes(t) ? 2 : 1;
  }
  return s + (item.kind === "product" ? 0.5 : 0);
}

export function initSearch() {
  const root = document.getElementById("search");
  if (!root) return;
  const input = root.querySelector("[data-search-input]");
  const out = root.querySelector("[data-search-results]");
  const status = root.querySelector("[data-search-status]");
  const index = buildIndex();

  const row = (it) => `
    <li>
      <a class="search-result" href="${it.url}">
        <span class="search-result__img">${it.img ? imgTag(it.img, "", { lazy: false }) : ""}</span>
        <span class="search-result__text">
          <span class="search-result__title">${typeset(it.title)}</span>
          <span class="search-result__meta">${escapeHTML(it.meta)}${it.kind === "brand" ? " · Brand" : ""}</span>
        </span>
      </a>
    </li>`;

  function run() {
    const q = norm(input.value.trim());
    if (!q) {
      out.innerHTML = index.filter((i) => i.kind === "product").map(row).join("");
      status.textContent = "Everything we make";
      return;
    }
    const terms = q.split(/\s+/);
    const hits = index.map((it) => ({ it, s: score(it, terms) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s);
    out.innerHTML = hits.map((h) => row(h.it)).join("");
    status.textContent = hits.length
      ? `${hits.length} ${hits.length === 1 ? "result" : "results"}`
      : "Nothing matches that yet. Try “cleanser”, “fragrance” or “sea-buckthorn”.";
  }

  input.addEventListener("input", run);
  root.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const first = out.querySelector("a");
    if (first) window.location.href = first.getAttribute("href");
  });
  root.addEventListener("shown.bs.modal", () => input.focus());
  root.addEventListener("hidden.bs.modal", () => { input.value = ""; });
  root.addEventListener("show.bs.modal", run);
}
