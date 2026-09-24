/* Origin page data, keyed by origin id and by the batch code printed in each tube's QR. */
export const ORIGINS = {
  "leh-ladakh": { name:"Leh, Ladakh", country:"India", lat:34.1526, lon:77.5771, altitude:"≈3,500 m", // TODO(client): exact farm
    ingredient:"Sea-buckthorn (Hippophae rhamnoides)", season:"Harvest: late August to October",
    text:"High-altitude sea-buckthorn, picked by hand from a single source." },
  "paris": { name:"Paris", country:"France", lat:48.8566, lon:2.3522,
    text:"A touch of Paris in every bottle." },  // TODO(client): exact perfumery / what is sourced from France
};
export const BATCHES = {
  "OO-LDK-2609-01": { productId:"one-origin-face-cleanser", originId:"leh-ladakh",
    field:"Field 3, Leh valley", harvestedBy:"Harvest team (names from client)", harvestDate:"2026-09-12",
    pressedDate:"2026-09-15", filledDate:"2026-09-20", labReport:"#",  // TODO(client): all real values
    grownSeason:"Summer 2026", formulatedDate:"2026-09-18" },          // TODO(client): the journey page shows these too
};
