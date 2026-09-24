/* ==========================================================================
   views/product-view.js: the product page's markup (§9.1), rendered as soon
   as the data arrives. Loaded early as an async module (it imports only data
   and pure helpers, never GSAP), and imported again by pages/product.js,
   which adds the behaviour. ES modules evaluate once, so it renders once.
   ========================================================================== */
import { CONFIG } from "../data/config.js";
import {
  productById, brandById, visibleProducts, escapeHTML, typeset, imgTag, altFor, toWebp, cutoutOf, brandURL,
  priceText, canBuy, formatPrice, setHead, summary, RITUALS,
} from "../core/format.js";
import { fillShelf, shelfShellHTML, originBlockHTML } from "./blocks.js";

const main = document.querySelector("[data-pdp]");
const id = new URLSearchParams(location.search).get("id");

export const product = productById(id);
export const found = !!product && visibleProducts().includes(product);
export const others = found ? visibleProducts().filter((x) => x.id !== product.id) : [];

/* ---- 1. Top ------------------------------------------------------------------ */
function topHTML(p, b, isTube, ritual) {
  const hero = toWebp(p.images.hero);
  const claims = (p.claims || []).map((c) => `<span>${escapeHTML(c)}</span>`).join("");
  const topPrice = CONFIG.pricePlacement === "top" ? `<p class="pdp-top__price num">${escapeHTML(priceText(p))}</p>` : "";
  const visual = isTube
    ? `
      <div class="stage pdp-stage" data-stage aria-label="${escapeHTML(p.fullName)}">
        <div class="stage__rise">
          <picture class="stage__poster pdp-stage__poster">${imgTag(hero, altFor(p), { lazy: false, extra: 'fetchpriority="high" id="pdp-fly"' })}</picture>
        </div>
        <p class="stage__hint" data-stage-hint hidden>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.8v3.4h-3.4"/></svg>
          <span>Drag to turn</span>
        </p>
      </div>
      <button class="link-draw pdp-reset" type="button" data-reset hidden>Reset view</button>`
    : `
      <div class="pdp-bottle" data-tilt>
        <div class="pdp-bottle__inner" data-tilt-inner>
          ${imgTag(hero, altFor(p), { lazy: false, extra: 'fetchpriority="high" id="pdp-fly"' })}
          <span class="pdp-bottle__leaves" style="--bottle:url('${new URL(hero, location.href).href}')" aria-hidden="true"></span>
        </div>
        <span class="pdp-bottle__plinth" aria-hidden="true"></span>
      </div>`;
  return `
    <section class="pdp-top" aria-labelledby="pdp-title">
      ${b?.kanji ? `<span class="kanji-marker pdp-top__marker" aria-hidden="true">${escapeHTML(b.kanji)}</span>` : ""}
      <div class="container-k pdp-top__grid">
        <div class="pdp-top__visual">${visual}</div>
        <div class="pdp-top__copy">
          <a class="pdp-top__brand" href="${brandURL(b)}">${typeset(b?.name || "")}</a>
          <h1 id="pdp-title" class="pdp-top__title">${typeset(p.name)}</h1>
          <p class="pdp-top__benefit">${escapeHTML(p.benefit)}</p>
          ${claims ? `<p class="pdp-top__claims">${claims}</p>` : ""}
          <p class="pdp-top__ritual">
            <span>Ritual: ${escapeHTML(p.ritualLabel || ritual?.label || "")}</span>
            <a class="link-draw" href="#pdp-what">Discover the ritual</a>
          </p>
          ${p.comingSoon ? `<p class="pdp-top__soon">Arriving soon. <a class="link-draw" href="#pdp-buy">Be the first to know</a></p>` : ""}
          ${topPrice}
        </div>
      </div>
    </section>`;
}

/* ---- 2. What it does ------------------------------------------------------------ */
function whatHTML(p) {
  // Tubes: the angle render. L’Arrivé: its one framed campaign moment. Otherwise the hero.
  const img = p.images.angle ? toWebp(p.images.angle) : p.images.campaign ? toWebp(p.images.campaign) : toWebp(p.images.hero);
  const framed = !p.images.angle && !!p.images.campaign;
  const text = p.whatItDoes || `${p.benefit}. More about it arrives with its name.`;
  return `
    <section class="section pdp-what" id="pdp-what" aria-labelledby="what-title">
      <div class="container-k">
        <div class="row align-items-center gy-5">
          <div class="col-lg-6">
            <h2 id="what-title" class="pdp-h2">What it does</h2>
            <p class="pdp-what__text" data-appear>${escapeHTML(text)}</p>
          </div>
          <div class="col-lg-5 offset-lg-1">
            <figure class="pdp-what__figure${framed ? " is-framed" : ""}">
              ${imgTag(img, framed ? `${p.fullName}, campaign photograph` : `${p.fullName}, turned`, {})}
            </figure>
          </div>
        </div>
      </div>
    </section>`;
}

/* ---- 3. What's inside ------------------------------------------------------------- */
function insideHTML(p) {
  let body;
  if (p.keyIngredient) {
    const natural = (p.claims || []).find((c) => /natural/i.test(c));
    body = `
      <div class="row align-items-center gy-5">
        <div class="col-lg-5 order-lg-2 offset-lg-1"><div class="pdp-branch" data-pdp-branch aria-hidden="true"></div></div>
        <div class="col-lg-6 order-lg-1">
          <p class="pdp-inside__key">${escapeHTML(p.keyIngredient)}</p>
          <p class="pdp-inside__text" data-appear>${escapeHTML(p.inside || "")}</p>
          ${natural ? `<p class="pdp-inside__statement" data-appear>${escapeHTML(natural)}.</p>` : ""}
        </div>
      </div>`;
  } else if (p.notes) {
    const col = (label, list) => `
      <div class="pdp-notes__col">
        <h3 class="pdp-notes__label">${label}</h3>
        <ul>${(list || []).map((n) => `<li>${escapeHTML(n)}</li>`).join("")}</ul>
      </div>`;
    body = `
      <div class="pdp-notes" data-appear>${col("Top", p.notes.top)}${col("Heart", p.notes.heart)}${col("Base", p.notes.base)}</div>
      ${p.longevityHours ? longevityHTML(p.longevityHours) : ""}`;
  } else {
    body = `<p class="pdp-inside__text" data-appear>Its notes will be revealed with its name.</p>`;
  }
  return `
    <section class="section pdp-inside" id="pdp-inside" aria-labelledby="inside-title">
      <div class="container-k">
        <h2 id="inside-title" class="pdp-h2">What’s inside</h2>
        ${body}
      </div>
    </section>`;
}

/* The working day from 8:00, filling in the accent as it scrolls into view. */
function longevityHTML(hours) {
  const start = 8;
  const marks = Array.from({ length: hours + 1 }, (_, i) => start + i)
    .map((h) => `<li${(h - start) % 2 ? ' class="is-minor"' : ""}><span class="num">${h}:00</span></li>`).join("");
  return `
    <figure class="longevity" data-longevity>
      <div class="longevity__track"><span class="longevity__fill" data-longevity-fill></span></div>
      <ol class="longevity__hours" style="--steps:${hours}">${marks}</ol>
      <figcaption class="longevity__caption">Up to <span class="num">${hours}</span> hours</figcaption>
    </figure>`;
}

/* ---- 4. How to use ------------------------------------------------------------------- */
const LINE = {   // thin line illustrations, chosen by what the step says
  water: '<path d="M12 3.5c3.2 4.6 5.3 7.6 5.3 10.2a5.3 5.3 0 0 1-10.6 0c0-2.6 2.1-5.6 5.3-10.2z"/>',
  circles: '<path d="M12 12a1.6 1.6 0 1 1 1.6 1.6A3.4 3.4 0 1 1 15.4 10a5.2 5.2 0 1 1-8.9 3.6"/>',
  rinse: '<path d="M3 9.5c3-2 6 2 9 0s6-2 9 0M3 14.5c3-2 6 2 9 0s6-2 9 0"/>',
  strokes: '<path d="M4 8h16M4 12h12M4 16h7"/>',
  sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/>',
  spray: '<path d="M4.5 10.5h4v6h-4zM6.5 10.5v-2h2M11 13.5h7M11 10.5l6-2.5M11 16.5l6 2.5"/>',
  settle: '<path d="M4 16c3-4 5-6 8-6s5 2 8 6"/><circle cx="12" cy="6" r="1"/>',
  apply: '<path d="M5 14c2.5-.6 4-2.4 5.4-4.6.6-1 2-1 2.4.1l.5 1.5M5 14l1.8 5.2h8.6c1.6-2.4 2.6-5 2.6-8"/><circle cx="16.5" cy="5.5" r="1.4"/>',
  step: '<path d="M5 12h14"/>',
};
function lineFor(text) {
  const t = text.toLowerCase();
  if (/rinse/.test(t)) return LINE.rinse;
  if (/wet|water/.test(t)) return LINE.water;
  if (/circle|massage a small/.test(t)) return LINE.circles;
  if (/stroke/.test(t)) return LINE.strokes;
  if (/spray/.test(t)) return LINE.spray;
  if (/settle|rub/.test(t)) return LINE.settle;
  if (/apply|bath/.test(t)) return LINE.apply;
  if (/daily|day|once/.test(t)) return LINE.sun;
  return LINE.step;
}
function howHTML(p) {
  if (!p.howTo?.length) return "";
  const steps = p.howTo.map((s, i) => `
    <li class="pdp-step" data-appear>
      <span class="pdp-step__n num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <svg class="pdp-step__art" viewBox="0 0 24 24" aria-hidden="true">${lineFor(s)}</svg>
      <p class="pdp-step__text">${escapeHTML(s)}</p>
    </li>`).join("");
  return `
    <section class="section pdp-how" aria-labelledby="how-title">
      <div class="container-k">
        <h2 id="how-title" class="pdp-h2">How to use</h2>
        <ol class="pdp-steps">${steps}</ol>
      </div>
    </section>`;
}

/* ---- 6. Make it yours ------------------------------------------------------------------ */
function stepperHTML() {
  return `
    <div class="stepper stepper--lg" role="group" aria-label="Quantity">
      <button type="button" class="stepper__btn" data-qty-step="-1" aria-label="Decrease quantity">−</button>
      <output class="stepper__val" id="pdp-qty" aria-live="polite">1</output>
      <button type="button" class="stepper__btn" data-qty-step="1" aria-label="Increase quantity">+</button>
    </div>`;
}
function buyHTML(p, buyable) {
  const note = `Free delivery on orders over ${formatPrice(CONFIG.freeShippingOver)}. Dispatched in 2 working days.`; // TODO(client): dispatch time
  const actions = buyable
    ? `
      <div class="pdp-buy__row">
        ${stepperHTML()}
        <button class="btn-ink pdp-buy__add" type="button" data-add-to-bag="${escapeHTML(p.id)}" data-qty-from="#pdp-qty" data-fly-from="#pdp-fly">Add to bag</button>
      </div>
      <p class="pdp-buy__note">${escapeHTML(note)}</p>`
    : `
      <div class="pdp-buy__row">
        <button class="btn-ink" type="button" data-notify>Notify me</button>
      </div>
      <p class="pdp-buy__note">${p.comingSoon ? "Leave your email and we’ll write when it arrives." : "Prices are shared at launch."}</p>`;
  return `
    <section class="section pdp-buy" id="pdp-buy" aria-labelledby="buy-title">
      <div class="container-k">
        <div class="row align-items-center gy-5">
          <div class="col-md-5 col-lg-4">
            <div class="pdp-buy__visual">${imgTag(cutoutOf(p), "", {})}</div>
          </div>
          <div class="col-md-7 col-lg-6 offset-lg-1">
            <h2 id="buy-title" class="pdp-h2">Make it yours</h2>
            <p class="pdp-buy__name">${typeset(p.fullName)}</p>
            <p class="pdp-buy__price num">${escapeHTML(priceText(p))}</p>
            <p class="pdp-buy__size num">${escapeHTML(p.size && p.size !== "TBC" ? p.size : "Size to be confirmed")}</p>
            ${actions}
          </div>
        </div>
      </div>
    </section>`;
}
function buybarHTML(p, buyable) {
  return `
    <div class="buybar" data-buybar aria-hidden="true" inert>
      <div class="container-k buybar__inner">
        <p class="buybar__name">${typeset(p.name)}</p>
        <p class="buybar__price num">${escapeHTML(priceText(p))}</p>
        ${buyable
          ? `<button class="btn-ink buybar__btn" type="button" data-add-to-bag="${escapeHTML(p.id)}" data-qty-from="#pdp-qty" data-fly-from="#pdp-fly">Add to bag</button>`
          : `<button class="btn-ink buybar__btn" type="button" data-notify>Notify me</button>`}
      </div>
    </div>`;
}

/* ---- 8. Structured data ---------------------------------------------------------------- */
function addProductSchema(p, b) {
  const abs = (u) => new URL(u, document.querySelector('link[rel="canonical"]')?.href || location.href).href;
  const data = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.fullName, sku: p.id, description: p.whatItDoes || p.benefit,
    brand: { "@type": "Brand", name: b?.name },
    image: [abs(toWebp(p.images.hero))],
    ...(p.size && p.size !== "TBC" ? { size: p.size } : {}),
  };
  if (CONFIG.showPrices && !p.comingSoon) {
    data.offers = { "@type": "Offer", priceCurrency: CONFIG.currency, price: p.price, availability: "https://schema.org/InStock", url: abs(`product.html?id=${p.id}`) };
  }
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/* ---- Render (once) -------------------------------------------------------------- */
function renderMissing() {
  setHead({ title: "Everything we make | Jiai Life", description: "One Origin skincare and L’Arrivé fragrance from Jiai Life." });
  main.innerHTML = `
    <section class="section page-top pdp-missing" aria-labelledby="missing-title">
      <div class="container-k">
        <h1 id="missing-title" class="t-h2">That product isn’t here.</h1>
        <p class="pdp-missing__lead">Here’s everything we make.</p>
        ${shelfShellHTML()}
      </div>
    </section>`;
  fillShelf(main.querySelector("[data-shelf]"), visibleProducts(), { headingLevel: 2 });
}

function renderProduct(p) {
  const b = brandById(p.brand);
  const buyable = canBuy(p);
  const ritual = RITUALS.find((r) => r.id === p.ritual);
  setHead({
    title: `${p.name} | Jiai Life`,
    description: summary(`${p.fullName}. ${p.benefit}. ${p.whatItDoes || ""}`),
    canonical: `product.html?id=${encodeURIComponent(p.id)}`,
  });
  addProductSchema(p, b);
  main.innerHTML = [
    topHTML(p, b, !!p.model, ritual),
    whatHTML(p),
    insideHTML(p),
    howHTML(p),
    p.originId ? originBlockHTML(p.originId, { productId: p.id, id: "pdp-origin" }) : "",
    buyHTML(p, buyable),
    others.length ? `
      <section class="section pdp-more" aria-labelledby="more-title">
        <div class="container-k">
          <h2 id="more-title" class="pdp-h2">Complete the ritual</h2>
          ${shelfShellHTML("shelf--mini")}
        </div>
      </section>` : "",
    buybarHTML(p, buyable),
  ].join("");
  if (others.length) fillShelf(main.querySelector(".pdp-more [data-shelf]"), others, { headingLevel: 3 });
}

if (main && !main.dataset.rendered) {
  main.dataset.rendered = "true";
  if (found) renderProduct(product); else renderMissing();
}
