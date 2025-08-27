import { fetchWithTimeout } from "./utils";
import zlib from "node:zlib";

// --- tiny helpers ---
const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const looksGzip = (b) => b && b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

// auto-detect delimiter from header line
function detectDelim(firstLine) {
  const candidates = [",", ";", "\t", "|"];
  let best = ","; let max = 0;
  for (const d of candidates) {
    const c = firstLine.split(d).length;
    if (c > max) { max = c; best = d; }
  }
  return best;
}

// minimal CSV parser with quotes + custom delimiter
function parseCSV(text) {
  const nl = text.indexOf("\n");
  const delim = detectDelim(text.slice(0, nl > -1 ? nl : undefined));
  const rows = [];
  let i = 0, f = "", row = [], q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) { if (c === '"' && text[i+1] === '"') { f += '"'; i+=2; continue; }
             if (c === '"') { q = false; i++; continue; }
             f += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === delim) { row.push(f); f = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(f); rows.push(row); f = ""; row = []; i++; continue; }
    f += c; i++;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map(h => (h || "").trim().toLowerCase());
  return rows.slice(1).map(r => { const o = {}; head.forEach((h, k) => o[h] = r[k]); return o; });
}

const paramsFrom = (link) => { try { return link ? new URL(link).searchParams : null; } catch { return null; } };
function buildUrl(raw, base, aff) {
  if (raw && /^https?:\/\//i.test(raw)) return raw; // AWIN deeplink or absolute
  const b = base || process.env.NEXT_PUBLIC_TP_BASE || "https://www.travisperkins.co.uk";
  let u; try { u = new URL(raw || "/", b); } catch { return raw || ""; }
  const p = paramsFrom(aff || process.env.TP_AFFIL_LINK || "");
  if (p) p.forEach((v,k)=>{ if(!u.searchParams.has(k)) u.searchParams.set(k,v); });
  return u.toString();
}

export async function search({ q }) {
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) return [];

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  if (process.env.FEED_TRAVIS_AUTH) headers["Authorization"] = process.env.FEED_TRAVIS_AUTH;

  const res = await fetchWithTimeout(feedUrl, { headers });
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");

  const rows = parseCSV(csv);

  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (s) => {
    const hay = String(s || "").toLowerCase();
    return terms.every(t => hay.includes(t));
  };

  const base = process.env.NEXT_PUBLIC_TP_BASE || "https://www.travisperkins.co.uk";
  const aff  = process.env.TP_AFFIL_LINK || "";

  const offers = [];
  for (const r of rows) {
    // Common AWIN field names (lowercased). We search several text fields.
    const name   = r["product name"] || r["name"] || r["title"] || "";
    const desc   = r["description"] || r["product description"] || "";
    const cats   = [r["category"], r["merchant_category"], r["sub category"], r["sub_category"]].filter(Boolean).join(" ");
    const priceS = r["search price"] || r["product price"] || r["price"] || r["current price"] || r["rrp"] || "";
    const deepl  = r["aw deeplink"] || r["aw_deeplink"] || r["deeplink"] || r["buy url"] || r["link"] || r["url"] || "";
    const merchU = r["merchant product url"] || r["merchant_product_url"] || r["product url"] || r["product_url"] || "";
    const image  = r["image url"] || r["image_url"] || r["merchant_image_url"] || "";
    const mpn    = r["mpn"] || r["sku"] || r["merchant_product_id"] || "";
    const gtin   = r["ean"] || r["gtin"] || r["barcode"] || "";

    const price = toNumber(priceS);
    if (!name || !Number.isFinite(price)) continue;

    const haystack = [name, desc, cats].join(" ");
    if (!matches(haystack)) continue;

    const url = buildUrl(deepl || merchU, base, aff);
    offers.push({ merchant: "Travis Perkins", product: name, pack: "", unit: "per item", price, url, image, mpn, gtin });
  }

  return offers;
}
