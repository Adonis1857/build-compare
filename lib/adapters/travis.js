import { fetchWithTimeout } from './utils.js';

export const name = "Travis Perkins";

export async function search(keywords) {
  const csvUrl = process.env.TRAVIS_CSV_URL;
  if (!csvUrl) {
    console.warn("Missing TRAVIS_CSV_URL env var");
    return [];
  }

  try {
    const res = await fetchWithTimeout(csvUrl);
    const csvText = await res.text();
    const rows = parseCsv(csvText);
    return rows.map(r => mapRowToOffer(r, keywords)).filter(Boolean);
  } catch (err) {
    console.error("Travis Perkins fetch failed:", err.message);
    return [];
  }
}

function parseCsv(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line) {
  const values = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  values.push(currentValue.trim());
  return values;
}

function mapRowToOffer(r, keywords) {
  const name = r["product_name"] || "";
  const price = parseFloat(r["search_price"] || r["price"] || "0");
  
  // 🔑 CRITICAL: Always use AWIN deep link first for tracking
  const deeplink = r["aw_deep_link"] || "";
  const merchantUrl = r["merchant_deep_link"] || "";
  const url = deeplink || merchantUrl; // Prefer AWIN link
  
  const image = r["aw_image_url"] || r["merchant_image_url"] || "";

  if (!name || !price || !url) return null;

  // Basic keyword matching
  const searchText = `${name} ${r["description"] || ""}`.toLowerCase();
  const searchTerms = keywords.toLowerCase().split(/\s+/).filter(Boolean);
  
  if (searchTerms.length > 0 && !searchTerms.every(term => searchText.includes(term))) {
    return null;
  }

  return {
    merchant: "Travis Perkins",
    product: name,
    price,
    url, // This now uses AWIN link when available
    image,
    unit: "per item",
    pack: r["size"] || "",
    mpn: r["merchant_product_id"] || "",
    gtin: r["ean"] || ""
  };
}
