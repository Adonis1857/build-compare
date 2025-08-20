import { fetchWithTimeout, mapJsonProductsToOffers } from "./utils";

export async function search({ q }) {
  const base = process.env.FEED_JEWSON_URL;
  if (!base) return []; // not configured in Vercel yet

  const url = base.includes("{q}") ? base.replace("{q}", encodeURIComponent(q)) : base;

  const res = await fetchWithTimeout(url, {
    headers: process.env.FEED_JEWSON_AUTH
      ? { Authorization: process.env.FEED_JEWSON_AUTH }
      : {},
  });
  const data = await res.json();

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
      merchant: "Jewson",
      // Adjust keys here if needed:
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
