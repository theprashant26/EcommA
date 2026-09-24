/* ==========================================================================
   views/brand-view.js: the brand page's markup (§9.3), rendered as soon as the
   data arrives (async module, no GSAP). pages/brand.js adds the shelf motion,
   the branch, the origin block and the letters form.
   ========================================================================== */
import {
  brandById, visibleBrands, productsOfBrand, escapeHTML, typeset, imgTag, toWebp, brandURL, setHead, summary,
} from "../core/format.js";
import { fillShelf, shelfShellHTML, originBlockHTML } from "./blocks.js";

const main = document.querySelector("[data-brand-page]");
export const brand = brandById(new URLSearchParams(location.search).get("b"));
export const mode = !brand || !visibleBrands().includes(brand) ? "index" : brand.status === "live" ? "live" : "coming";

/* ---- A live brand ------------------------------------------------------------------- */
function renderLive(b) {
  const products = productsOfBrand(b.id);
  setHead({ title: `${b.name} | Jiai Life`, description: summary(`${b.name}: ${b.line}. ${b.story}`), canonical: `brand.html?b=${encodeURIComponent(b.id)}` });
  const lead = products[0];
  // Brand context: One Origin carries its sea-buckthorn branch; L’Arrivé its dark-glass bottle.
  const art = b.id === "one-origin"
    ? `<div class="brand-hero__branch" data-brand-branch aria-hidden="true"></div>`
    : lead?.images?.dark
      ? `<figure class="brand-hero__bottle">${imgTag(toWebp(lead.images.dark), "", { lazy: false, extra: 'fetchpriority="high"' })}<span class="brand-hero__line" aria-hidden="true"></span></figure>`
      : "";
  main.innerHTML = `
    <section class="brand-hero brand-hero--${escapeHTML(b.id)}" aria-labelledby="brand-title">
      ${b.kanji ? `<span class="kanji-marker brand-hero__marker" aria-hidden="true">${escapeHTML(b.kanji)}</span>` : ""}
      <div class="container-k brand-hero__grid">
        <div class="brand-hero__copy">
          <p class="brand-hero__category">${escapeHTML(b.category)}</p>
          <h1 id="brand-title" class="brand-hero__title">${typeset(b.name)}</h1>
          <p class="brand-hero__line-text">${escapeHTML(b.line || "")}</p>
          <p class="brand-hero__story">${escapeHTML(b.story || "")}</p>
        </div>
        <div class="brand-hero__art">${art}</div>
      </div>
    </section>

    <section class="section brand-range" aria-labelledby="range-title">
      <div class="container-k">
        <h2 id="range-title" class="brand-range__title" data-reveal-lines>${products.length === 1 ? "The one we make." : "What we make."}</h2>
        ${shelfShellHTML()}
      </div>
    </section>

    ${b.originId ? originBlockHTML(b.originId, { id: "brand-origin" }) : ""}`;

  fillShelf(main.querySelector("[data-shelf]"), products);
}

/* ---- A brand that's on its way --------------------------------------------------------- */
function renderComing(b) {
  setHead({ title: `${b.name} | Jiai Life`, description: `${b.name} is arriving soon at Jiai Life. Leave your email to hear first.`, canonical: `brand.html?b=${encodeURIComponent(b.id)}` });
  const lead = productsOfBrand(b.id)[0];
  main.innerHTML = `
    <section class="brand-hero brand-hero--coming" aria-labelledby="brand-title">
      ${b.kanji ? `<span class="kanji-marker brand-hero__marker" aria-hidden="true">${escapeHTML(b.kanji)}</span>` : ""}
      <div class="container-k brand-hero__grid">
        <div class="brand-hero__copy">
          <p class="brand-hero__category">${escapeHTML(b.category || "")} · Arriving soon</p>
          <h1 id="brand-title" class="brand-hero__title">${typeset(b.name)}</h1>
          <p class="brand-hero__line-text">${escapeHTML(b.line || "Name to be revealed")}</p>
          <p class="brand-hero__story">A new house for the quiet hours is on its way. One short letter will tell you when it arrives.</p>
          <form class="letters__form brand-hero__form" data-newsletter>
            <label class="visually-hidden" for="brand-email">Email address</label>
            <input class="field" id="brand-email" type="email" name="email" autocomplete="email" placeholder="Your email address" required>
            <button class="btn-ink" type="submit">Notify me</button>
          </form>
          <p class="field-msg" data-newsletter-msg aria-live="polite"></p>
        </div>
        <div class="brand-hero__art">
          ${lead ? `<figure class="brand-hero__bottle">${imgTag(toWebp(lead.images.hero), "", { lazy: false, extra: 'fetchpriority="high"' })}<span class="brand-hero__line" aria-hidden="true"></span></figure>` : ""}
        </div>
      </div>
    </section>`;
}

/* ---- No brand given: the house index ------------------------------------------------------ */
function renderIndex() {
  setHead({ title: "Our brands | Jiai Life", description: "The house of Jiai: considered brands, each with its own character.", canonical: "brand.html" });
  const rows = visibleBrands().map((x) => {
    const n = productsOfBrand(x.id).length;
    const meta = x.status === "live" ? `${escapeHTML(x.category)} · <span class="num">${n}</span> ${n === 1 ? "product" : "products"}` : `${escapeHTML(x.category || "")} · Arriving soon`;
    return `<li><a class="house__row" href="${brandURL(x)}"><span class="house__name">${typeset(x.name)}</span><span class="house__meta">${meta}</span></a></li>`;
  }).join("");
  main.innerHTML = `
    <section class="section page-top" aria-labelledby="brand-title">
      <div class="container-k">
        <h1 id="brand-title" class="t-h2">The house of Jiai.</h1>
        <p class="brand-index__lead">Jiai Life is a home for considered brands. Each has its own character. All share one belief: caring for yourself is the most elegant act of all.</p>
        <ul class="house__list">${rows}</ul>
      </div>
    </section>`;
}

/* ---- Render (once) ------------------------------------------------------------------ */
if (main && !main.dataset.rendered) {
  main.dataset.rendered = "true";
  if (mode === "index") renderIndex();
  else if (mode === "live") renderLive(brand);
  else renderComing(brand);
}
