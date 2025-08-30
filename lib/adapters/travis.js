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
  const feedUrl = process.env.FEED_TRAVIS_URL;
  // +++ Log if the variable is missing +++
  if (!feedUrl) {
    console.error("CRITICAL ERROR: The FEED_TRAVIS_URL environment variable is empty or not found.");
    return [];
  }

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  let res;
  try {
    // +++ Try to fetch the feed +++
    res = await fetchWithTimeout(feedUrl, { headers });
    // +++ LOG THE HTTP STATUS CODE - This is the most important clue! +++
    console.log(`Fetching Travis Perkins feed: HTTP ${res.status} ${res.statusText}`);
    
    // +++ If the request failed (e.g., 403 Forbidden, 404 Not Found), throw an error +++
    if (!res.ok) {
      throw new Error(`Feed request failed: ${res.status} ${res.statusText}`);
    }

  } catch (error) {
    // +++ Log any network errors (e.g., no connection, timeout) +++
    console.error("Network error fetching Travis Perkins feed:", error.message);
    return [];
  }

  try {
    // +++ Try to read the response data +++
    const buf = Buffer.from(await res.arrayBuffer());
    // +++ LOG THE FIRST 200 CHARACTERS OF THE RAW RESPONSE - This shows us if it's CSV, HTML, or an error message +++
    const rawDataPreview = buf.toString('utf8').substring(0, 200);
    console.log("Raw feed data preview:", rawDataPreview);

    const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    const rows = parseCSV(csv);
    // +++ LOG THE COLUMN HEADERS FROM THE CSV - This tells us if the column names match our code +++
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

      // broad match: include if ANY term appears
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
    // +++ Log how many offers we found +++
    console.log(`Found ${offers.length} offers for search terms: ${terms}`);
    return offers;

  } catch (error) {
    // +++ Log any errors in processing the data (e.g., invalid CSV, not GZIP) +++
    console.error("Error processing Travis Perkins feed data:", error.message);
    return [];
  }
}
