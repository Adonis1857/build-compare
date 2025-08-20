import { fetchWithTimeout, mapJsonProductsToOffers } from "./utils";

export async function search({ q }) {
  const base = process.env.FEED_TOOLSTATION_URL;
  if (!base) return []; // not configured in Vercel yet

  // Support either a search API (…?q={q}) or a full-catalog feed
  const url = base.includes("{q}") ? base.replace("{q}", encodeURIComponent(q)) : base;

  const res = await fetchWithTimeout(url, {
    headers: process.env.FEED_TOOLSTATION_AUTH
      ? { Authorization: process.env.FEED_TOOLSTATION_AUTH }
      : {},
  });
  const data = await res.json();

  // Try common shapes: array, {products:[]}, {items:[]}, {results:[]}
  const products = Array.isArray(data)
    ? data
    : Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.results)
    ? data.results
    : [];

  return mapJsonProductsToOffers(
    products,
    {
      merchant: "Toolstation",
      // If your feed uses different names, uncomment & set:
      // nameKey: "title",
      // priceKey: "unitPrice",
      // urlKey: "productUrl",
      // gtinKey: "ean",
      // mpnKey: "mpn",
      // packKey: "size",
      // unitKey: "unit",
    },
    q
  );
}
