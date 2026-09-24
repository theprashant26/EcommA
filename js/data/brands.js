/* The house of Jiai. Add a brand here and every menu, index and filter picks it up.
   status: "live" | "coming" (shown, "Arriving soon") | "teaser" (only if CONFIG.showComingBrands) */
export const BRANDS = [
  { id:"one-origin", name:"One Origin", line:"Single source purity", category:"Skin",
    kanji:"肌", accent:"var(--oo-orange)",
    story:"Skincare built on a single, traceable ingredient source. Our sea-buckthorn comes from one place, picked by hand, and every tube carries a code that shows you where.",
    originId:"leh-ladakh", status:"live" },
  { id:"larrive", name:"L’Arrivé", line:"Une touche de Paris", category:"Fragrance",
    kanji:"香", accent:"var(--la-black)",
    story:"French for “arrived”. Fragrance for the one who no longer needs to try, made to last from the morning commute to the evening.",
    originId:"paris", status:"live" },
  { id:"jiai-no2", name:"Nº 2", line:"Name to be revealed", category:"Fragrance",
    kanji:"香", status:"coming" },           // TODO(client): real name + story
  { id:"black-truth", name:"Black Truth", category:"Coming to the house", status:"teaser" }, // shown only if CONFIG.showComingBrands
  { id:"white-lie",  name:"White Lie",  category:"Coming to the house", status:"teaser" },
];
