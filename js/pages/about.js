/* ==========================================================================
   about.js: about.html (§9.5). A slow, reading-first page: each paragraph of
   the client's text reveals line by line as it enters (0.9s, stagger .08).
   ========================================================================== */
import { initMotion, revealLines } from "../core/motion.js";
import { initKomorebi } from "../core/komorebi.js";
import { initHeader } from "../core/header.js";
import { initCart } from "../core/cart.js";
import { initSearch } from "../core/search.js";
import { prefersReducedMotion } from "../core/format.js";

initMotion();
initKomorebi({ stage: "morning" });
initHeader();
initCart();
initSearch();

const paragraphs = document.querySelectorAll(".about [data-reveal-lines]");
if (prefersReducedMotion()) paragraphs.forEach((p) => { p.style.visibility = "visible"; });
else paragraphs.forEach((p) => revealLines(p, { duration: 0.9, stagger: 0.08 }));
