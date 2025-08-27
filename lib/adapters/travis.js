import { fetchWithTimeout } from "./utils";
import zlib from "node:zlib";

function parseCSV(text) {
  const rows = []; let i = 0, f = "", row = [], q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) { if (c === '"' && text[i+1] === '"') { f += '"'; i+=2; continue; }
             if (c === '"') { q = false; i++; continue; }
             f += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(f); f = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(f); rows.push(row); f = ""; row = []; i++; continue; }
    f += c; i++;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map(h => (h || "").trim().toLowerCase());
  return rows.slice(1).map(r => { const o = {}; head.forEach((h, idx) => o[h] = r[idx]); return o; });
}
const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const looksGzip = (b) => b && b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

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
  const match = (s) => { const hay = String(s || "").toLowerCase(); return terms.every(t => hay.includes(t)); };

  const offers = [];
  for (const r of rows) {
    const name = r["product name"] || r["name"] || r["title"] || "";
    const priceStr = r["search price"] || r["product price"] || r["price"] || r["current price"] || "";
    const deeplink = r["aw deeplink"] || r["aw_deeplink"] || r["deeplink"] || r["buy url"] || r["link"] || r["url"] || "";
    const merchUrl = r["merchant product url"] || r["merchant_product_url"] || r["product url"] || r["product_url"] || "";

    const price = toNumber(priceStr);
    if (!name || !Number.isFinite(price)) continue;
    if (!match(name)) continue;

    const url = deeplink || merchUrl || "";
    offers.push({ merchant: "Travis Perkins", product: name, pack: "", unit: "per item", price, url });
  }
  return offers;
}
