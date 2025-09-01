import { fetchWithTimeout } from "./utils";
import zlib from "node:zlib";

const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const n = Number(v.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

const looksGzip = (b) => b && b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b;

// basic CSV parser
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj = {};
    header.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

export async function search({ q }) {
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) {
    console.error("CRITICAL: FEED_TRAVIS_URL environment variable is not set.");
    return [];
  }
  console.log("Using the exact Awin feed URL.");

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  let res;
  try {
    res = await fetchWithTimeout(feedUrl, { headers });
    console.log(`Downloading Feed: HTTP ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

  } catch (error) {
    console.error("Network error downloading the product feed:", error.message);
    return [];
  }

  try {
    const buf = Buffer.from(await res.arrayBuffer());
    const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    const rows = parseCSV(csv);
    console.log(`Successfully parsed ${rows.length} products from the feed.`);

    const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    console.log(`Filtering for search terms: ${terms}`);

    if (terms.length === 0) {
      console.log("No search term provided. Returning no results.");
      return [];
    }

    const offers = [];
    for (const r of rows) {
      const name  = r["product_name"] || "";
      const desc  = r["description"] || "";
      const cat   = r["merchant_category"] || r["category_name"] || "";
      const price = toNumber(r["search_price"] || r["store_price"]);
      const deeplink = r["aw_deep_link"] || "";
      const image = r["merchant_image_url"] || r["aw_image_url"] || "";
      const url   = r["merchant_deep_link"] || deeplink;

      if (!name || !Number.isFinite(price)) continue;

      const hay = [name, desc, cat].join(" ").toLowerCase();
      if (!terms.some(t => hay.includes(t))) continue;

      offers.push({
        merchant: "Travis Perkins",
        product: name,
        price,
        url,
        image,
        unit: "per item",
        pack: "",
        mpn: r["merchant_product_id"] || "",
      });
    }
    console.log(`Found ${offers.length} products matching "${q}"`);
    return offers;

  } catch (error) {
    console.error("Error processing the CSV data:", error.message);
    return [];
  }
}
