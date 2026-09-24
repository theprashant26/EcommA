/* ==========================================================================
   header.js: header states, Shop mega menu, mobile menu, and the parts of
   the footer that come from data. The header/footer markup itself is a
   static partial, identical on every page; everything page-specific
   (active link, generated lists) is filled in here.
   ========================================================================== */
import { ORIGINS } from "../data/origins.js";
import {
  visibleBrands, productsOfBrand, escapeHTML, typeset, cutoutOf, imgTag, productURL, brandURL, ritualURL, RITUALS,
  formatLatLon, isEmail, prefersReducedMotion,
} from "./format.js";
import { toast } from "./toast.js";

const { gsap, ScrollTrigger } = window;

/* ---- Header states ----------------------------------------------------------- */
function initHeaderStates(header) {
  // Solid after 40px: a GSAP ScrollTrigger class toggle; CSS does the easing.
  ScrollTrigger.create({ start: 40, end: "max", toggleClass: { targets: header, className: "is-solid" } });

  // Hide on scroll down, reveal on scroll up. Tween only when direction flips.
  let hidden = false;
  const show = (yes) => {
    if (hidden === !yes) return;
    hidden = !yes;
    gsap.to(header, { yPercent: yes ? 0 : -100, duration: prefersReducedMotion() ? 0 : 0.6, ease: "komorebi", overwrite: true });
  };
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate(self) {
      if (header.classList.contains("mega-open") || header.contains(document.activeElement)) return show(true);
      if (self.scroll() < 160) return show(true);
      show(self.direction < 0);
    },
  });
  // Keyboard users tabbing into a hidden header bring it back.
  header.addEventListener("focusin", () => show(true));
}

/* ---- Active link ------------------------------------------------------------- */
function markCurrent() {
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav] a[href]").forEach((a) => {
    const file = a.getAttribute("href").split(/[?#]/)[0];
    if (file && file === here && !a.getAttribute("href").includes("#")) a.setAttribute("aria-current", "page");
  });
}

/* ---- Shop mega menu ------------------------------------------------------------ */
function megaMarkup() {
  const brandCols = visibleBrands().map((b) => {
    const items = productsOfBrand(b.id).map((p) => `
      <li>
        <a class="mega__product" href="${productURL(p)}">
          <span class="mega__thumb">${imgTag(cutoutOf(p), "", { lazy: false })}</span>
          <span class="mega__name">${typeset(p.name)}${p.comingSoon ? '<span class="mega__soon">Arriving soon</span>' : ""}</span>
        </a>
      </li>`).join("");
    return `
      <div class="mega__col">
        <a class="mega__brand" href="${brandURL(b)}">${typeset(b.name)}</a>
        <p class="mega__line">${escapeHTML(b.line || b.category || "")}</p>
        <ul class="mega__list">${items || '<li class="mega__soon">Arriving soon</li>'}</ul>
      </div>`;
  }).join("");
  const rituals = RITUALS.map((r) => `
      <li><a class="mega__ritual" href="${ritualURL(r)}"><span class="mega__kanji" aria-hidden="true">${r.kanji}</span>${r.label}</a></li>`).join("");
  return `${brandCols}
      <div class="mega__col mega__col--ritual">
        <p class="mega__brand">Shop by ritual</p>
        <p class="mega__line">From first light to the quiet hours</p>
        <ul class="mega__list">${rituals}</ul>
        <a class="link-draw mega__all" href="shop.html">See the whole collection</a>
      </div>`;
}

function initMega(header) {
  const item = header.querySelector("[data-mega-item]");
  const trigger = item?.querySelector("[data-mega-trigger]");
  const panel = item?.querySelector("[data-mega]");
  if (!item || !panel) return;
  const desktop = window.matchMedia("(min-width: 992px)");
  let built = false, open = false, closeTimer, suppressFocus = false;

  const set = (yes) => {
    clearTimeout(closeTimer);
    if (yes === open || (yes && !desktop.matches)) return;
    open = yes;
    if (yes && !built) { panel.querySelector("[data-mega-inner]").innerHTML = megaMarkup(); built = true; }
    trigger.setAttribute("aria-expanded", String(yes));
    header.classList.toggle("mega-open", yes);
    const d = prefersReducedMotion() ? 0 : 0.6;
    if (yes) {
      gsap.set(panel, { visibility: "visible" });
      gsap.fromTo(panel, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: d, ease: "komorebi", overwrite: true });
      gsap.fromTo(panel.querySelectorAll(".mega__col"), { autoAlpha: 0 }, { autoAlpha: 1, duration: d, stagger: 0.05, delay: d * 0.3, overwrite: true });
    } else {
      gsap.to(panel, { clipPath: "inset(0 0 100% 0)", duration: d * 0.7, ease: "komorebi", overwrite: true,
        onComplete: () => { if (!open) gsap.set(panel, { visibility: "hidden" }); } });
    }
  };
  const later = () => { clearTimeout(closeTimer); closeTimer = setTimeout(() => set(false), 140); };

  item.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") set(true); });
  item.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") later(); });
  trigger.addEventListener("focus", () => { if (!suppressFocus) set(true); });
  item.addEventListener("focusout", (e) => { if (!item.contains(e.relatedTarget)) set(false); });
  item.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !open) return;
    set(false);
    // Return focus to "Shop" without re-opening the panel.
    suppressFocus = true;
    trigger.focus();
    suppressFocus = false;
  });
  desktop.addEventListener("change", () => set(false));
}

/* ---- Mobile menu ----------------------------------------------------------------- */
function initMobileMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;
  const brandList = menu.querySelector("[data-menu-brands]");
  if (brandList) {
    brandList.innerHTML = visibleBrands().map((b) =>
      `<li><a href="${brandURL(b)}">${escapeHTML(b.name)}</a></li>`).join("");
  }
  menu.addEventListener("show.bs.offcanvas", () => {
    // the seal is fetched the first time the menu opens, not with the page
    menu.querySelectorAll("img[data-src]").forEach((img) => { img.src = img.dataset.src; img.removeAttribute("data-src"); });
    if (prefersReducedMotion()) return;
    gsap.fromTo(menu.querySelectorAll(".menu__link, .menu__brands li, .menu__seal"),
      { yPercent: 60, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06, ease: "expo.out", delay: 0.1, overwrite: true });
  });
  // Close before following an in-page link so the scroll can happen.
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a[href]")) window.bootstrap?.Offcanvas.getInstance(menu)?.hide();
  });
}

/* ---- Footer: generated lists and origin coordinates -------------------------------- */
function initFooter() {
  const shop = document.querySelector("[data-footer-shop]");
  if (shop) {
    shop.innerHTML = visibleBrands().map((b) =>
      `<li><a href="${brandURL(b)}">${escapeHTML(b.name)}</a></li>`).join("") +
      '<li><a href="shop.html">All products</a></li>';
  }
  const coords = document.querySelector("[data-footer-coords]");
  if (coords) {
    coords.innerHTML = visibleBrands().filter((b) => b.status === "live" && ORIGINS[b.originId]).map((b) => {
      const o = ORIGINS[b.originId];
      return `<li><span class="footer__coord-name">${escapeHTML(b.name)}</span> <span class="num">${formatLatLon(o)}</span></li>`;
    }).join("");
  }
}

/* ---- Newsletter (no backend yet) ------------------------------------------------------ */
/** Validate and "subscribe" one [data-newsletter] form. Safe to call more than once. */
export function wireNewsletter(form) {
  if (!form || form.dataset.wired) return;
  form.dataset.wired = "1";
  const input = form.querySelector('input[type="email"]');
  const msg = form.querySelector("[data-newsletter-msg]") || form.parentElement.querySelector("[data-newsletter-msg]");
  form.noValidate = true;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isEmail(input.value)) {
      input.setAttribute("aria-invalid", "true");
      if (msg) msg.textContent = "Please enter a valid email address.";
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    if (msg) msg.textContent = "";
    form.reset();
    toast("Subscribed. Your first letter arrives next season.");
  });
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") && isEmail(input.value)) {
      input.removeAttribute("aria-invalid");
      if (msg) msg.textContent = "";
    }
  });
}
const initNewsletters = () => document.querySelectorAll("form[data-newsletter]").forEach(wireNewsletter);

export function initHeader() {
  const header = document.querySelector(".site-header");
  if (header) {
    initHeaderStates(header);
    initMega(header);
  }
  markCurrent();
  initMobileMenu();
  initFooter();
  initNewsletters();
}
