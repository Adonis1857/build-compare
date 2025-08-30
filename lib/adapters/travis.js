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
  // 1. Get the URL from the environment variable
  const feedUrl = process.env.FEED_TRAVIS_URL;
  if (!feedUrl) {
    console.error("CRITICAL: FEED_TRAVIS_URL environment variable is not set.");
    return [];
  }
  console.log("Using Travis Perkins feed URL from environment variable.");

  const headers = { Accept: "text/csv,application/octet-stream,*/*" };
  let res;
  try {
    // 2. Fetch the EXACT URL provided by Awin. DO NOT MODIFY THE URL.
    res = await fetchWithTimeout(feedUrl, { headers });
    console.log(`Feed Download: HTTP ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

  } catch (error) {
    console.error("Network error downloading the product feed:", error.message);
    return [];
  }

  try {
    // 3. Process the downloaded CSV/GZIP file
    const buf = Buffer.from(await res.arrayBuffer());
    const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    const rows = parseCSV(csv);
    console.log(`Total products in feed: ${rows.length}`);

    // 4. Get the user's search term and prepare it for matching
    const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    console.log(`Searching for terms: ${terms}`);

    // 5. If there's no search term, return nothing. We don't want to show the entire massive feed.
    if (terms.length === 0) {
      return [];
    }

    const offers = [];
    // 6. Loop through every product in the feed and check if it matches the search
    for (const r of rows) {
      const name  = r["product_name"] || "";
      const desc  = r["description"] || "";
      const cat   = r["merchant_category"] || r["category_name"] || "";
      const price = toNumber(r["search_price"] || r["store_price"]);
      const deeplink = r["aw_deep_link"] || "";
      const image = r["merchant_image_url"] || r["aw_image_url"] || "";
      const url   = r["merchant_deep_link"] || deeplink;

      // Skip products without a name or price
      if (!name || !Number.isFinite(price)) continue;

      // Combine product fields into one string to search against
      const hay = [name, desc, cat].join(" ").toLowerCase();
      // Check if ANY of the search terms are in the combined string
      if (!terms.some(t => hay.includes(t))) continue;

      // If it matches, add it to the results
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
    // 7. Return the matching results
    console.log(`Found ${offers.length} offers for "${q}"`);
    return offers;

  } catch (error) {
    console.error("Error processing the product feed data:", error.message);
    return [];
  }
}
