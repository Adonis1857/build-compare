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

// +++ NEW FUNCTION: This fixes broken URLs from the feed +++
function cleanUrl(url) {
  if (!url) return '';

  // First, decode the URL in case it's already encoded (to avoid double-encoding)
  try {
    url = decodeURIComponent(url);
  } catch (e) {
    // If decoding fails, just use the original URL
    console.warn("Could not decode URL, using original:", url);
  }

  // Now, properly encode it to make it safe for browsers
  // This fixes spaces, quotes, and other special characters
  try {
    // Create a URL object to handle it properly
    const urlObj = new URL(url);
    // This will automatically encode any special characters in the URL parts
    return urlObj.toString();
  } catch (e) {
    // If it's not a valid URL (e.g., just a plain string), encode it manually
    console.warn("Invalid URL, encoding manually:", url);
    return encodeURI(url);
  }
}

export async function search({ q }) {
  const apiKey = process.env.AWIN_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: The AWIN_API_KEY environment variable is not set.");
    return [];
  }

  const baseFeedUrl = `https://productdata.awin.com/datafeed/download/apikey/${apiKey}/language/en/fid/84524/format/csv/compression/gzip`;
  const urlObj = new URL(baseFeedUrl);
  urlObj.searchParams.set('query', q || '');
  const targetUrl = urlObj.toString();

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
    const csv = looksGzip(buf) ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
    const rows = parseCSV(csv);

    const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

    const offers = [];
    for (const r of rows) {
      const name  = r["product_name"] || "";
      const desc  = r["description"] || "";
      const cat   = r["merchant_category"] || r["category_name"] || "";
      const price = toNumber(r["search_price"] || r["store_price"]);
      const deeplink = r["aw_deep_link"] || "";
      const image = r["merchant_image_url"] || r["aw_image_url"] || "";
      let url   = r["merchant_deep_link"] || deeplink;

      // +++ FIX THE URL RIGHT HERE BEFORE USING IT +++
      url = cleanUrl(url); // This line is new and fixes the URL

      if (!name || !Number.isFinite(price)) continue;

      const hay = [name, desc, cat].join(" ").toLowerCase();
      if (!terms.some(t => hay.includes(t))) continue;

      offers.push({
        merchant: "Travis Perkins",
        product: name,
        price,
        url, // This URL is now cleaned and fixed!
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
