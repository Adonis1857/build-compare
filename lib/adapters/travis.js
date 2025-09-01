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
      const url   = r["merchant_deep_link"] || deeplink; // <-- This is the original line

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
