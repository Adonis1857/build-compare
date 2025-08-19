import { fetchWithTimeout, mapJsonProductsToOffers } from "./utils";

/**
 * FEED_TRAVIS_URL, FEED_TRAVIS_AUTH (optional)
 */
export async function search({ q }) {
  const url = process.env.FEED_TRAVIS_URL;
  if (!url) return [];
  const res = await fetchWithTimeout(url, {
    headers: process.env.FEED_TRAVIS_AUTH ? { Authorization: process.env.FEED_TRAVIS_AUTH } : {},
  });
  const data = await res.json();
  const products = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
  return mapJsonProductsToOffers(products, { merchant: "Travis Perkins" }, q);
}
