import { fetchWithTimeout, mapJsonProductsToOffers } from "./utils";

/**
 * Configure via env:
 * FEED_SCREWFIX_URL=https://example.com/screwfix.json
 * FEED_SCREWFIX_AUTH=Bearer your_token   (optional)
 */
export async function search({ q }) {
  const url = process.env.FEED_SCREWFIX_URL;
  if (!url) return []; // not configured yet
  const res = await fetchWithTimeout(url, {
    headers: process.env.FEED_SCREWFIX_AUTH ? { Authorization: process.env.FEED_SCREWFIX_AUTH } : {},
  });
  const data = await res.json();
  const products = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
  return mapJsonProductsToOffers(products, { merchant: "Screwfix" }, q);
}
