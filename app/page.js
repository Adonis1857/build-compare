'use client';
import React, { useState, useEffect } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function toNumberPrice(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeAndSort(offers) {
  const arr = (offers || []).map((o) => {
    const retailer = o.retailer || o.merchant || "Unknown";
    const price = toNumberPrice(o.price);
    const id = o.id || `${retailer}-${o.product || ""}-${o.url || ""}`;
    return { ...o, id, retailer, price };
  });
  return arr.filter((o) => Number.isFinite(o.price)).sort((a, b) => a.price - b.price);
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
      {children}
    </span>
  );
}

function ResultCard({ offer, query }) {
  const retailer = offer.retailer || offer.merchant || "Unknown";
  const clickHref = offer.url
    ? `/api/click?m=${encodeURIComponent(retailer)}&q=${encodeURIComponent(query || "")}&to=${encodeURIComponent(offer.url)}`
    : "#";

  return (
    <a
      href={clickHref}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border p-4 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{offer.product}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge>{retailer}</Badge>
            {offer.pack ? <Badge>{offer.pack}</Badge> : null}
            <span className="text-gray-400">-</span>
            <span>{offer.unit || "each"}</span>
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
  const [query, setQuery] = useState("");   // ✅ still tracks query
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function run() {
      const q = String(query || "").trim();
      if (!q) { setResults([]); setError(""); return; }
      setLoading(true); setError("");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const offers = Array.isArray(json.offers) ? json.offers : [];
        const data = normalizeAndSort(offers);
        if (!ignore) setResults(data);
      } catch (e) {
        if (!ignore) { setResults([]); setError("Couldn’t load live results."); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [query]);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* ✅ Header removed — now handled by components/Header.js */}

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
                  <ResultCard key={o.id ?? `${(o.retailer||o.merchant)}-${o.product}-${o.price}`} offer={o} query={query} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-center text-gray-600">
              No live results for <q>{query}</q>. Try another term.
            </div>
          )
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-gray-700">
            <p className="font-medium mb-1">How it works</p>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Type a material in the search bar.</li>
              <li>We list matching offers from Travis Perkins (live data only).</li>
              <li>Sorted from least expensive to most expensive.</li>
            </ul>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-gray-500">
        (c) {new Date().getFullYear()} BuildCompare
      </footer>
    </div>
  );
}
