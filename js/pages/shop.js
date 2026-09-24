/* ==========================================================================
   shop.js: shop.html (§9.2). The collection, filtered by brand or ritual.
   Chips, grid and quick view are all generated from data; filtering re-lays
   the grid with GSAP Flip. ?b=<brand> or ?ritual=<time> preselects a chip.
   ========================================================================== */
import { initMotion, revealLines, appear } from "../core/motion.js";
import { initKomorebi, setTimeOfDay } from "../core/komorebi.js";
import { initHeader } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import {
  brandById, productById, escapeHTML, typeset, imgTag, altFor, toWebp, productURL, priceText, canBuy,
  prefersReducedMotion, setHead,
} from "../core/format.js";
import { bindTurn } from "../core/shelf.js";
import { FILTERS, initialFilter, showOnly } from "../views/shop-view.js";

const { gsap, Flip } = window;
if (Flip) gsap.registerPlugin(Flip);

initMotion();
initKomorebi({ stage: "morning" });
initHeader();
initCart();
initSearch();

const reduced = prefersReducedMotion();
const grid = document.querySelector("[data-shop-grid]");
const chipsEl = document.querySelector("[data-shop-filters]");
bindTurn(grid);

const cards = [...grid.querySelectorAll(".shop-card")];
let active = "all";

function apply(key, { animate = true, push = true } = {}) {
  const f = FILTERS.find((x) => x.key === key) || FILTERS[0];
  active = f.key;
  const state = animate && Flip && !reduced ? Flip.getState(cards) : null;
  showOnly(f.key, cards);
  if (state) {
    Flip.from(state, {
      duration: 0.8, ease: "komorebi", absolute: true, nested: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out" }),
      onLeave: (els) => gsap.to(els, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }),
    });
  }
  // The light follows the ritual you choose.
  setTimeOfDay(f.ritual || "morning");

  if (push) {
    const url = new URL(location.href);
    url.searchParams.delete("b"); url.searchParams.delete("ritual");
    if (f.group === "brand") url.searchParams.set("b", f.key.slice(2));
    if (f.group === "ritual") url.searchParams.set("ritual", f.key.slice(2));
    history.replaceState(null, "", url);
  }
  const title = f.key === "all" ? "The collection | Jiai Life" : `${f.label} | The collection | Jiai Life`;
  setHead({ title });
}

chipsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (btn && btn.dataset.filter !== active) apply(btn.dataset.filter);
});

apply(initialFilter, { animate: false, push: false });   // the view already showed it; this sets light + title

/* ---- Quick view ----------------------------------------------------------------- */
let modal, modalEl, opener = null;
function ensureModal() {
  if (modalEl) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal fade quick" id="quick" tabindex="-1" aria-labelledby="quick-title" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <button class="icon-btn quick__close" type="button" data-bs-dismiss="modal" aria-label="Close quick view">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></svg>
          </button>
          <div class="quick__grid" data-quick-body></div>
        </div>
      </div>
    </div>`);
  modalEl = document.getElementById("quick");
  modal = new window.bootstrap.Modal(modalEl);
  // Opened from script, so Bootstrap won't restore focus itself: return it to the card's button.
  modalEl.addEventListener("hidden.bs.modal", () => { opener?.focus(); opener = null; });
}

function openQuick(id) {
  const p = productById(id);
  if (!p) return;
  ensureModal();
  const b = brandById(p.brand);
  const buy = canBuy(p);
  modalEl.querySelector("[data-quick-body]").innerHTML = `
    <div class="quick__visual">
      <span class="quick__plinth" aria-hidden="true"></span>
      ${imgTag(toWebp(p.images.hero), altFor(p), { lazy: false, extra: 'id="quick-img"' })}
    </div>
    <div class="quick__copy">
      <p class="shelf__brand">${typeset(b?.name || "")}</p>
      <h2 class="quick__title" id="quick-title">${typeset(p.name)}</h2>
      <p class="quick__benefit">${escapeHTML(p.benefit)}</p>
      ${p.whatItDoes ? `<p class="quick__text">${escapeHTML(p.whatItDoes)}</p>` : ""}
      <p class="quick__meta num">${escapeHTML(p.size && p.size !== "TBC" ? p.size : "Size to be confirmed")} · ${escapeHTML(priceText(p))}</p>
      <div class="quick__actions">
        ${buy ? `<button class="btn-ink" type="button" data-add-to-bag="${escapeHTML(p.id)}" data-fly-from="#quick-img">Add to bag</button>` : ""}
        <a class="link-draw" href="${productURL(p)}">The full story</a>
      </div>
    </div>`;
  modal.show();
}

grid.addEventListener("click", (e) => {
  const q = e.target.closest("[data-quick]");
  if (q) { opener = q; openQuick(q.dataset.quick); }
});

/* ---- Motion ------------------------------------------------------------------------ */
// The grid itself simply appears (it is the first screen's content); only the words ease in.
revealLines(document.querySelector("[data-reveal-lines]"), { scroll: false });
appear(document.querySelectorAll("[data-appear]"), { scroll: false });
