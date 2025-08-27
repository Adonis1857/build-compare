// app/api/search/route.js
export const runtime = "nodejs";

import merchantsCfg from "@/lib/adapters/merchants.json";
import { search as travis } from "@/lib/adapters/travis";
import { parseQuery } from "@/lib/search/parse";

// Registry maps merchant names in merchants.json to adapter functions
const registry = {
  "Travis Perkins": travis,
};

// --- Tiny in-memory cache (per serverless instance) ---
const CACHE_TTL_MS = 5 * 60 * 1000;
const g = globalThis;
g.__searchCache ??= new Map();

function getCache(key) {
  const hit = g.__searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) {
    g.__searchCache.delete(key);
    return null;
  }
  return hit.v;
}
function setCache(key, v) {
  g.__searchCache.set(key, { v, t: Date.now() });
}

// Simple text filter to guard against overly broad adapter results
function buildFilter(q) {
  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return (text) => {
    const hay = String(text || "").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();
  const debugMode = searchParams.get("debug") === "1";
  if (!qRaw) return Response.json({ offers: [] });

  const parsed = parseQuery(qRaw);
  const q = parsed.normalized;

  // Build enabled adapters list from merchants.json
  const defs = (merchantsCfg?.merchants || [])
    .filter((m) => m.enabled)
    .map((m) => ({ name: m.name, env: m.env, fn: registry[m.name] }))
    .filter((d) => typeof d.fn === "function");

  // Cache key depends on normalized query + which adapters are enabled
  const key = JSON.stringify({ q, adapters: defs.map((d) => d.name).sort() });
  if (!debugMode) {
    const cached = getCache(key);
    if (cached) return Response.json(cached);
  }

  // Run all enabled adapters in parallel
  const settled = await Promise.allSettled(defs.map((d) => d.fn({ q })));

  let offers = [];
  const dbg = [];

  settled.forEach((r, i) => {
    const d = defs[i];
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      offers = offers.concat(r.value);
      if (debugMode)
        dbg.push({
          adapter: d.name,
          envPresent: !!process.env[d.env],
          count: r.value.length,
          sample: r.value[0] || null,
        });
    } else {
      if (debugMode)
        dbg.push({
          adapter: d.name,
          envPresent: !!process.env[d.env],
          error: String(r.reason || "unknown error"),
        });
    }
  });

  // Safety filter + sort by price asc
  const filter = buildFilter(q);
  const matches = offers.filter((o) => filter([o.product, o.pack, o.unit, o.merchant].join(" ")));
  matches.sort(
    (a, b) =>
      (Number.isFinite(a.price) ? a.price : Infinity) -
      (Number.isFinite(b.price) ? b.price : Infinity)
  );

  const payload = debugMode ? { offers: matches, debug: dbg } : { offers: matches };
  if (!debugMode) setCache(key, payload);
  return Response.json(payload);
}
