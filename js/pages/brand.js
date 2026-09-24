/* ==========================================================================
   brand.js: brand.html?b=… (§9.3): behaviour. views/brand-view.js renders the
   hero, shelf and origin (early, async); this adds the motion and the form.
   ========================================================================== */
import { initMotion, revealLines, appear } from "../core/motion.js";
import { initKomorebi } from "../core/komorebi.js";
import { initHeader, wireNewsletter } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import { animateShelf, bindTurn } from "../core/shelf.js";
import { mountBranch, mountOriginBlock } from "../core/illustrations.js";
import "../views/brand-view.js";

initMotion();
initKomorebi({ stage: "morning" });
initHeader();
initCart();
initSearch();

const main = document.querySelector("[data-brand-page]");
main.querySelectorAll("[data-shelf]").forEach((shelf) => { animateShelf(shelf); bindTurn(shelf); });
mountBranch(main.querySelector("[data-brand-branch]"));
mountOriginBlock(main.querySelector("#brand-origin"));
wireNewsletter(main.querySelector("[data-newsletter]"));   // the "Arriving soon" form, if this is a coming brand
main.querySelectorAll("[data-reveal-lines]").forEach((el) => revealLines(el, { scroll: !el.closest(".brand-hero") }));
appear(main.querySelectorAll("[data-appear]"));
