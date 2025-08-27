import { fetchWithTimeout } from "./utils";

/**
 * Travis Perkins (AWIN Create-a-Feed CSV) adapter.
 * Uses:
 *  - FEED_TRAVIS_URL (required) → AWIN Create-a-Feed CSV URL
 *  - FEED_TRAVIS_AUTH (optional) → Authorization header value
 *  - NEXT_PUBLIC_TP_BASE (optional) → defaults to https://www.travisperkins.co.uk
 *  - TP_AFFIL_LINK (optional) → harvests affiliate params if deeplink lacks them
 */

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ""; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows[0].map(h => (h || "").trim().toLowerCase());
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, idx) => { o[h] = r[idx]; });
    return o;
  });
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function harvestParams(link) { try { return link ? new URL(link).searchParams : null; } catch { return null; } }

function buildUrl(raw, base, aff) {
  if (raw && /^https?:\/\//i.test(raw)) return raw; // already absolute (AWIN deeplink)
  const b = base || "https://www.travisperkins.co.uk";
  let u; try { u = new URL(raw || "/", b); } catch { return raw || ""; }
  const p = harvestParams(aff);
  if (p) p.forEach((v, k) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
  return u.toString();
}

export async function search({ q }) {
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) return []; // no feed → no results (prevents demo)

  const headers = {};
  if (process.env.FEED_TRAVIS_AUTH) headers["Authorization"] = process.env.FEED_TRAVIS_AUTH;

  const res = await fetchWithTimeout(feedUrl, { headers });
  const csv = await res.text();
  const rows = parseCSV(csv);

  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = (s) => {
    const hay = String(s || "").toLowerCase();
    return terms.every(t => hay.includes(t));
  };

  const base = process.env.NEXT_PUBLIC_TP_BASE || "https://www.travisperkins.co.uk";
  const aff  = process.env.TP_AFFIL_LINK || "";

  const offers = [];
  for (const r of rows) {
    // Common AWIN headers (lowercased by parser)
    const name     = r["product name"] || r["product_name"] || r["name"] || r["title"] || "";
    const priceStr = r["search price"] || r["product price"] || r["price"] || r["current price"] || "";
    const deeplink = r["aw deeplink"] || r["aw_deeplink"] || r["deeplink"] || r["buy url"] || r["link"] || r["url"] || "";
    const merchUrl = r["merchant product url"] || r["merchant_product_url"] || r["product url"] || r["product_url"] || "";
    const image    = r["image url"] || r["image_url"] || r["merchant_image_url"] || "";
    const mpn      = r["mpn"] || r["sku"] || r["merchant_product_id"] || "";
    const gtin     = r["ean"] || r["gtin"] || r["barcode"] || "";

    const price = toNumber(priceStr);
    if (!name || !Number.isFinite(price)) continue;
    if (!match(name)) continue;

    const url = buildUrl(deeplink || merchUrl, base, aff);

    offers.push({
      merchant: "Travis Perkins",
      product: name,
      pack: "",
      unit: "per item",
      price,
      url,
      image,
      mpn,
      gtin,
    });
  }

  return offers;
}
