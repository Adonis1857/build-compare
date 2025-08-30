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
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // split on commas outside quotes
    const obj = {};
    header.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

export async function search({ q }) {
  // +++ USE THE ORIGINAL URL FROM THE ENV VAR +++
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) {
    console.error("CRITICAL: FEED_TRAVIS_URL environment variable is not set.");
    return [];
  }

  // +++ THIS IS THE MAGIC LINE THAT FIXED IT BEFORE: Add the query parameter +++
  const urlObj = new URL(feedUrl);
  urlObj.searchParams.set('query', q || ''); 
  const targetUrl = urlObj.toString();
  console.log("Using URL:", targetUrl); // This will log the URL we're trying to use

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  let res;
  try {
    res = await fetchWithTimeout(targetUrl, { headers });
    console.log(`Fetching Travis Perkins feed: HTTP ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      throw new Error(`Feed request failed: ${res.status} ${res.statusText}`);
    }

  } catch (error) {
    console.error("Network error fetching Travis Perkins feed:", error.message);
    return [];
  }

  try {
    const buf = Buffer.from(await res.arrayBuffer());
    const rawDataPreview = buf.toString('utf8').substring(0, 200);
    console.log("Raw feed data preview:", rawDataPreview);

    const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    const rows = parseCSV(csv);
    if (rows.length > 0) {
        console.log("CSV Column headers:", Object.keys(rows[0]));
    }
    console.log(`Number of rows in CSV: ${rows.length}`);

    const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

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
    console.log(`Found ${offers.length} offers for search terms: ${terms}`);
    return offers;

  } catch (error) {
    console.error("Error processing Travis Perkins feed data:", error.message);
    return [];
  }
}
