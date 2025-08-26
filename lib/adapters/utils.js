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

/** Parse an affiliate landing link and return its search params for reuse */
function extractAffiliateParams(link) {
  try {
    if (!link) return null;
    const u = new URL(link);
    return u.searchParams; // URLSearchParams
  } catch {
    return null;
  }
}

/** Build an absolute product URL and optionally append affiliate params */
function makeMerchantUrl(merchant, rawUrl) {
  if (!rawUrl) return "";

  // Per-merchant base domains (used when feed gives relative paths)
  const BASES = {
    "Travis Perkins": process.env.NEXT_PUBLIC_TP_BASE || "https://www.travisperkins.co.uk",
  };

  // Optional affiliate “landing” link to harvest params from (server-side env)
  const AFFIL_LINKS = {
    "Travis Perkins": process.env.TP_AFFIL_LINK || process.env.NEXT_PUBLIC_TP_AFFIL_LINK || "",
  };

  const base = BASES[merchant];
  let absolute;

  try {
    // If rawUrl is relative, resolve against base; else trust as-is
    absolute = new URL(rawUrl, base).toString();
  } catch {
    // Fallback: just return raw string
    return String(rawUrl);
  }

  // Append affiliate params (without duplicating existing keys)
  const affilParams = extractAffiliateParams(AFFIL_LINKS[merchant]);
  if (affilParams && absolute.startsWith(base)) {
    const u = new URL(absolute);
    affilParams.forEach((val, key) => {
      if (!u.searchParams.has(key)) u.searchParams.set(key, val);
    });
    absolute = u.toString();
  }

  return absolute;
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
    const rawUrl = p?.[urlKey] ?? p?.productUrl ?? p?.link ?? "";
    const url = makeMerchantUrl(merchant, rawUrl);
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
