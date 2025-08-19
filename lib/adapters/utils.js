// lib/adapters/utils.js

export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000); // 8s safety timeout
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Map a JSON feed to standard Offer objects and filter by q (case-insensitive, partial).
 * Adjust the key names in cfg if your feed uses different fields.
 */
export function mapJsonProductsToOffers(products, cfg, q) {
  const {
    merchant,
    nameKey = "name",
    priceKey = "price",
    urlKey = "url",
    gtinKey = "gtin",
    mpnKey = "mpn",
    packKey = "pack",
    unitKey = "unit",
  } = cfg;

  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = (text) => {
    const hay = String(text || "").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };

  const offers = [];
  for (const p of products || []) {
    const name = p?.[nameKey] ?? p?.title ?? p?.product ?? "";
    const price = Number(p?.[priceKey]);
    const url = p?.[urlKey] ?? "";
    const pack = p?.[packKey] ?? p?.size ?? p?.variant ?? "";
    const unit = p?.[unitKey] ?? "per item";
    const gtin = p?.[gtinKey];
    const mpn = p?.[mpnKey];

    if (!name || !isFinite(price)) continue;
    if (!match([name, pack].join(" "))) continue;

    offers.push({ merchant, product: name, pack, unit, price, url, gtin, mpn });
  }
  return offers;
}
