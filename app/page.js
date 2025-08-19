'use client';
import React, { useState, useEffect } from "react";

// ----------------------------------------------------------------------------
// Minimal MVP: client-side search over a small demo dataset
// ----------------------------------------------------------------------------

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** @typedef {{
 *  id: string,
 *  productId: string,
 *  product: string,
 *  keywords: string[],
 *  retailer: string,
 *  pack: string,
 *  unit: string,
 *  price: number,
 *  url?: string
 * }} Offer */

/** @type {Offer[]} */
const OFFERS = [
  // Silicone Sealant (single tubes)
  {
    id: "silicone-screwfix-1",
    productId: "silicone-clear-310ml",
    product: "Sanitary Silicone Clear",
    keywords: ["silicone", "sanitary", "sealant", "clear", "310ml"],
    retailer: "Screwfix",
    pack: "310ml",
    unit: "per tube",
    price: 3.29,
    url: "https://www.screwfix.com/",
  },
  {
    id: "silicone-bq-1",
    productId: "silicone-clear-310ml",
    product: "Sanitary Silicone Clear",
    keywords: ["silicone", "sanitary", "sealant", "clear", "310ml"],
    retailer: "B&Q",
    pack: "310ml",
    unit: "per tube",
    price: 3.99,
    url: "https://www.diy.com/",
  },
  {
    id: "silicone-travis-1",
    productId: "silicone-clear-300ml",
    product: "Sanitary Silicone Clear",
    keywords: ["silicone", "sanitary", "sealant", "clear", "300ml"],
    retailer: "Travis Perkins",
    pack: "300ml",
    unit: "per tube",
    price: 5.1,
    url: "https://www.travisperkins.co.uk/",
  },

  // Wood screws 5x50mm (box of ~200)
  {
    id: "screws-bq-200",
    productId: "screws-5x50-200",
    product: "Wood Screws 5x50mm (Box of 200)",
    keywords: ["screws", "5x50", "5 x 50", "wood", "200"],
    retailer: "B&Q",
    pack: "Box of 200",
    unit: "per box",
    price: 11.5,
    url: "https://www.diy.com/",
  },
  {
    id: "screws-screwfix-200",
    productId: "screws-5x50-200",
    product: "Wood Screws 5x50mm (Box of 200)",
    keywords: ["screws", "5x50", "5 x 50", "wood", "200"],
    retailer: "Screwfix",
    pack: "Box of 200",
    unit: "per box",
    price: 12.99,
    url: "https://www.screwfix.com/",
  },
  {
    id: "screws-travis-200",
    productId: "screws-5x50-200",
    product: "Wood Screws 5x50mm (Box of 200)",
    keywords: ["screws", "5x50", "5 x 50", "wood", "200"],
    retailer: "Travis Perkins",
    pack: "Box of 200",
    unit: "per box",
    price: 16.8,
    url: "https://www.travisperkins.co.uk/",
  },

  // Cement 25kg
  {
    id: "cement-bq-25kg",
    productId: "cement-25kg",
    product: "General Purpose Cement 25kg",
    keywords: ["cement", "25kg", "general purpose"],
    retailer: "B&Q",
    pack: "25kg",
    unit: "per bag",
    price: 5.75,
    url: "https://www.diy.com/",
  },
  {
    id: "cement-screwfix-25kg",
    productId: "cement-25kg",
    product: "General Purpose Cement 25kg",
    keywords: ["cement", "25kg", "general purpose"],
    retailer: "Screwfix",
    pack: "25kg",
    unit: "per bag",
    price: 6.49,
    url: "https://www.screwfix.com/",
  },
  {
    id: "cement-travis-25kg",
    productId: "cement-25kg",
    product: "General Purpose Cement 25kg",
    keywords: ["cement", "25kg", "general purpose"],
    retailer: "Travis Perkins",
    pack: "25kg",
    unit: "per bag",
    price: 6.9,
    url: "https://www.travisperkins.co.uk/",
  },

  // MDF 18mm sheet
  {
    id: "mdf-bq-18mm",
    productId: "mdf-18mm-2440x1220",
    product: "MDF Board 18mm 2440x1220",
    keywords: ["mdf", "18mm", "board", "sheet", "2440", "1220"],
    retailer: "B&Q",
    pack: "2440x1220x18mm",
    unit: "per sheet",
    price: 30.0,
    url: "https://www.diy.com/",
  },
  {
    id: "mdf-screwfix-18mm",
    productId: "mdf-18mm-2440x1220",
    product: "MDF Board 18mm 2440x1220",
    keywords: ["mdf", "18mm", "board", "sheet", "2440", "1220"],
    retailer: "Screwfix",
    pack: "2440x1220x18mm",
    unit: "per sheet",
    price: 31.0,
    url: "https://www.screwfix.com/",
  },
  {
    id: "mdf-travis-18mm",
    productId: "mdf-18mm-2440x1220",
    product: "MDF Board 18mm 2440x1220",
    keywords: ["mdf", "18mm", "board", "sheet", "2440", "1220"],
    retailer: "Travis Perkins",
    pack: "2440x1220x18mm",
    unit: "per sheet",
    price: 34.0,
    url: "https://www.travisperkins.co.uk/",
  },
];

// Pure function so we can test it easily
function searchOffers(query, offers = OFFERS) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const matches = offers.filter((o) => {
    const hay = [o.product, o.retailer, o.pack, ...(o.keywords || [])]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  // Sort by price ascending
  return matches.sort((a, b) => a.price - b.price);
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
      {children}
    </span>
  );
}

function ResultCard({ offer }) {
  return (
    <a
      href={offer.url || "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border p-4 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{offer.product}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge>{offer.retailer}</Badge>
            <Badge>{offer.pack}</Badge>
            <span className="text-gray-400">-</span>
            <span>{offer.unit}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{GBP.format(offer.price)}</div>
          <div className="text-xs text-gray-500">Cheapest to Highest</div>
        </div>
      </div>
    </a>
  );
}

export default function App() {
  const [query, setQuery] = useState("");

  // Results now come from the API (with local fallback)
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = ["silicone", "screws 5x50", "cement 25kg", "mdf 18mm"];
  // Simplified placeholder (no quotes)
  const placeholder = "Search materials e.g. silicone or screws 5x50";

  // Fetch official-feed results; fallback to local searchOffers if feeds aren't set
  useEffect(() => {
    let ignore = false;
    async function run() {
      const q = String(query || "").trim();
      if (!q) { setResults([]); return; }
      setLoading(true); setError("");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const offers = Array.isArray(json.offers) ? json.offers : [];
        const data = offers.length ? offers : searchOffers(q); // local fallback
        if (!ignore) setResults(data);
      } catch (_) {
        const data = searchOffers(String(query || "")); // local fallback on error
        if (!ignore) { setResults(data); setError("Using local data while feeds are offline."); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [query]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-900 text-white px-2 py-1 text-xs font-semibold">BuildCompare</div>
            <h1 className="text-base font-semibold text-gray-800">UK Building Materials Price Search</h1>
          </div>

          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3 pr-12 text-base outline-none focus:ring-2 focus:ring-gray-900"
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">Ctrl+K</div>
            </div>
            {!query && (
              <div className="mt-2 text-sm text-gray-600">
                Try: {suggestions.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="underline decoration-dotted hover:text-gray-900 mr-2"
                  >
                    {s}
                    {i < suggestions.length - 1 ? "," : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading && <div className="mt-2 text-sm text-gray-500">Loading offers…</div>}
        {error && <div className="mt-2 text-sm text-amber-600">{error}</div>}

        {query ? (
          results.length ? (
            <>
              <div className="mb-3 text-sm text-gray-600">
                Showing {results.length} offer{results.length !== 1 ? "s" : ""} for <q className="font-medium">{query}</q> sorted by price.
              </div>
              <div className="grid gap-3">
                {results.map((o) => (
                  <ResultCard key={o.id ?? `${o.merchant}-${o.product}-${o.price}`} offer={o} />
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-500">Demo data for illustration only. In production, prices update live and include stock/collection info.</p>
            </>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-center text-gray-600">
              No matches. Try a simpler term like <button className="underline" onClick={() => setQuery("silicone")}>silicone</button> or <button className="underline" onClick={() => setQuery("cement 25kg")}>cement 25kg</button>.
            </div>
          )
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-gray-700">
            <p className="font-medium mb-1">How it works</p>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Type a material in the search bar.</li>
              <li>We list matching offers from retailers like Screwfix, B&amp;Q and Travis Perkins.</li>
              <li>Sorted from least expensive to most expensive.</li>
            </ul>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-gray-500">
        (c) {new Date().getFullYear()} BuildCompare - Demo MVP
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Runtime tests (dev only)
// ---------------------------------------------------------------------------
function runDevTests() {
  const tests = [];
  const push = (name, fn) => tests.push({ name, fn });

  // Helpers
  const ids = (arr) => arr.map((o) => o.id);
  const isSortedAsc = (arr) => arr.every((v, i) => i === 0 || arr[i - 1] <= v);

  push("empty query returns []", () => {
    const r = searchOffers("");
    console.assert(Array.isArray(r) && r.length === 0, "Expected [] for empty query");
  });

  push("unknown term returns []", () => {
    const r = searchOffers("definitely-not-a-product");
    console.assert(Array.isArray(r) && r.length === 0, "Expected [] for unknown term");
  });

  push("silicone returns 3 sorted by price", () => {
    const r = searchOffers("silicone");
    console.assert(r.length === 3, `Expected 3, got ${r.length}`);
    console.assert(isSortedAsc(r.map((o) => o.price)), "Silicone not sorted asc by price");
    console.assert(ids(r)[0] === "silicone-screwfix-1", "Cheapest silicone should be Screwfix");
    console.assert(ids(r)[2] === "silicone-travis-1", "Most expensive silicone should be Travis Perkins");
  });

  push("screws 5x50 returns 3 sorted by price", () => {
    const r = searchOffers("screws 5x50");
    console.assert(r.length === 3, `Expected 3, got ${r.length}`);
    console.assert(isSortedAsc(r.map((o) => o.price)), "Screws not sorted asc by price");
    console.assert(ids(r)[0] === "screws-bq-200", "Cheapest screws should be B&Q");
    console.assert(ids(r)[2] === "screws-travis-200", "Most expensive screws should be Travis Perkins");
  });

  push("cement 25kg returns 3 sorted by price", () => {
    const r = searchOffers("cement 25kg");
    console.assert(r.length === 3, `Expected 3, got ${r.length}`);
    console.assert(isSortedAsc(r.map((o) => o.price)), "Cement not sorted asc by price");
    console.assert(ids(r)[0] === "cement-bq-25kg", "Cheapest cement should be B&Q");
    console.assert(ids(r)[2] === "cement-travis-25kg", "Most expensive cement should be Travis Perkins");
  });

  push("mdf 18mm returns 3 sorted by price", () => {
    const r = searchOffers("mdf 18mm");
    console.assert(r.length === 3, `Expected 3, got ${r.length}`);
    console.assert(isSortedAsc(r.map((o) => o.price)), "MDF not sorted asc by price");
    console.assert(ids(r)[0] === "mdf-bq-18mm", "Cheapest MDF should be B&Q");
    console.assert(ids(r)[2] === "mdf-travis-18mm", "Most expensive MDF should be Travis Perkins");
  });

  // Execute
  let passed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed += 1;
    } catch (err) {
      console.error("Test failed:", t.name, err);
    }
  }
  console.info(`Runtime tests completed: ${passed}/${tests.length} passed`);
}

if (typeof window !== "undefined" && process.env && process.env.NODE_ENV !== "production") {
  try { runDevTests(); } catch (_) { /* ignore in prod */ }
}
