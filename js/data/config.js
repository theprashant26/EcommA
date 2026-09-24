/* Site-wide switches. Everything the client may toggle lives here. */
export const CONFIG = {
  currency: "INR",
  showPrices: true,               // client may hide prices during the preview
  pricePlacement: "after-story",  // "after-story" | "top" (PDP)
  showComingBrands: false,        // teaser tiles for names mentioned in the meeting; client to approve
  freeShippingOver: 999,          // TODO(client)
};
