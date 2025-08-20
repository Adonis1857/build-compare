// lib/adapters/utils.js

export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(id);
  }
}

function toNumber(v) {
  if (typeof v === "number") return v;

  // Common nested price shapes
  if (v && typeof v === "object") {
    if (typeof v.value === "number") return v.value;
    if (typeof v.amount === "number") return v.amount;
    if (typeof v.value === "string") v = v.value;
    else if (typeof v.amount === "string") v = v.amount;
  }

  if (typeof v === "string") {
    // Strip currency symbols & spaces, normalise comma thousands
    const cleaned = v.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }
  return NaN;
}

/**
 * Map a JSON feed to standard Offer objects and filter by q.
 * Adjust key names in cfg if your feed uses different fields.
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
    // Try several price locations before giving up
    const rawPrice = p?.[priceKey] ?? p?.unitPrice ?? p?.price?.value ?? p?.price?.amount ?? p?.pricing?.price;
    const price = toNumber(rawPrice);
    const url = p?.[urlKey] ?? p?.productUrl ?? p?.link ?? "";
    const pack = p?.[packKey] ?? p?.size ?? p?.variant ?? "";
    const unit = p?.[unitKey] ?? "per item";
    const gtin = p?.[gtinKey] ?? p?.ean ?? p?.gtin13 ?? p?.barcode;
    const mpn = p?.[mpnKey] ?? p?.sku ?? p?.mpn;

    if (!name || !Number.isFinite(price)) continue;
    if (!match([name, pack].join(" "))) continue;

    offers.push({ merchant, product: name, pack, unit, price, url, gtin, mpn });
  }
  return offers;
}
