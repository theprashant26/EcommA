/* Every product on the site renders from this list. Adding a product is a data edit only. */
export const PRODUCTS = [
  { id:"one-origin-face-cleanser", brand:"one-origin",
    name:"Face Cleanser", fullName:"One Origin Face Cleanser",
    benefit:"Skin brightening and anti-pigmentation",
    forWho:"For all skin types", size:"100 ml",
    price:649, priceNote:"placeholder",            // TODO(client)
    ritual:"morning", ritualLabel:"Morning and night",
    keyIngredient:"Organic sea-buckthorn",
    claims:["100% natural ingredients","With organic sea-buckthorn","For all skin types"],
    whatItDoes:"A gentle daily cleanser that lifts away the day without stripping skin. Organic sea-buckthorn, prized for its vitamin C and omega-7, helps skin look brighter and more even over time.",
    inside:"Organic sea-buckthorn from a single source, in a formula made with 100% natural ingredients.", // TODO(client): full INCI list
    howTo:["Wet your face with lukewarm water.","Massage a small amount in slow circles for 30 seconds.","Rinse well. Use morning and night."],
    images:{ hero:"assets/products/cleanser/cleanser-hero.webp", cutout:"assets/products/cleanser/cleanser-cutout.png",
             angle:"assets/products/cleanser/cleanser-angle.png", back:"assets/products/cleanser/cleanser-back.png" },
    model:"assets/models/cleanser.glb", spin:"assets/spin/cleanser/", originId:"leh-ladakh" },

  { id:"one-origin-body-lotion", brand:"one-origin",
    name:"Organic Moisturizing Body Lotion", fullName:"One Origin Organic Moisturizing Body Lotion",
    benefit:"Skin brightening and anti-pigmentation",
    forWho:"For smoother body", size:"100 ml",
    price:749, priceNote:"placeholder",            // TODO(client)
    ritual:"evening", ritualLabel:"After every bath",
    keyIngredient:"Organic sea-buckthorn",
    claims:["100% natural ingredients","With organic sea-buckthorn","For smoother skin"],
    whatItDoes:"A light, fast-absorbing lotion that softens and smooths skin from shoulders to heels while helping it look brighter and more even.",
    inside:"Organic sea-buckthorn from a single source, in a formula made with 100% natural ingredients.", // TODO(client)
    howTo:["Apply to clean skin after bathing.","Massage in long strokes until absorbed.","Use daily."],
    images:{ hero:"assets/products/lotion/lotion-hero.webp", cutout:"assets/products/lotion/lotion-cutout.png",
             angle:"assets/products/lotion/lotion-angle.png", back:"assets/products/lotion/lotion-back.png" },
    model:"assets/models/lotion.glb", spin:"assets/spin/lotion/", originId:"leh-ladakh" },

  { id:"larrive-body-spray", brand:"larrive",
    name:"L’Arrivé", fullName:"L’Arrivé Premium Body Spray for Men",
    benefit:"Premium body spray for men", size:"150 ml",   // TODO(client): confirm size
    price:899, priceNote:"placeholder",            // TODO(client)
    ritual:"day", ritualLabel:"Every morning",
    longevityHours:10,
    notes:{ top:["Bergamot","Pink pepper"], heart:["Lavender","Violet leaf"], base:["Vetiver","Amberwood"] }, // TODO(client): real notes
    whatItDoes:"A clean, confident scent made to last up to 10 hours. Spray at eight, still there at six.",
    howTo:["Spray on chest and neck from 15 cm.","Let it settle; don’t rub.","Once is enough for the day."],
    images:{ hero:"assets/products/larrive/larrive-cutout-light.webp", dark:"assets/products/larrive/larrive-cutout.webp",
             campaign:"assets/products/larrive/larrive-campaign.webp" },
    originId:"paris" },

  { id:"perfume-no2", brand:"jiai-no2",
    name:"Nº 2", fullName:"Nº 2 (name to be revealed)", benefit:"A new fragrance from Jiai Life",
    size:"TBC", price:999, priceNote:"placeholder", ritual:"night", ritualLabel:"For the quiet hours",
    comingSoon:true,
    images:{ hero:"assets/products/perfume-02/perfume-02-placeholder.webp" } },
];
