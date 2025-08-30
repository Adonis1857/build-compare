import { fetchWithTimeout } from "./utils";
import zlib from "node:zlib";

const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

const looksGzip = (b) => b && b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

// very basic CSV split (safe enough since AWIN CSV is clean)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // split on commas outside quotes
    const obj = {};
    header.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

export async function search({ q }) {
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) return [];

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  const res = await fetchWithTimeout(feedUrl, { headers });
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");

  const rows = parseCSV(csv);
  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (s) => {
    const hay = String(s || "").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };

  const offers = [];
  for (const r of rows) {
    const name = r["product name"] || "";
    const desc = r["description"] || "";
    const cat  = r["category"] || "";
    const price = toNumber(r["price"] || r["search price"]);
    const deeplink = r["aw deeplink"] || "";
    const image = r["image url"] || "";
    const url = r["merchant product url"] || deeplink;

    if (!name || !Number.isFinite(price)) continue;
    if (!matches([name, desc, cat].join(" "))) continue;

    offers.push({
      merchant: "Travis Perkins",
      product: name,
      price,
      url,
      image,
      unit: "per item",
      pack: "",
      mpn: r["merchant product id"] || "",
    });
  }

  return offers;
}
