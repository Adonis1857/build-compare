export const runtime = "nodejs";

import { search as screwfix } from "@/lib/adapters/screwfix";
import { search as bq } from "@/lib/adapters/bq";
import { search as travis } from "@/lib/adapters/travis";

// tiny in-memory cache (per serverless instance)
const CACHE_TTL_MS = 5 * 60 * 1000;
const g = globalThis;
g.__searchCache ??= new Map();
function getCache(key) {
  const hit = g.__searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) { g.__searchCache.delete(key); return null; }
  return hit.v;
}
function setCache(key, v) { g.__searchCache.set(key, { v, t: Date.now() }); }

function buildFilter(q) {
  const terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return (text) => {
    const hay = String(text || "").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };
}

// GET /api/search?q=silicone
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const key = JSON.stringify({ q });
  const cached = getCache(key);
  if (cached) return Response.json(cached);

  if (!q) return Response.json({ offers: [] });

  const adapters = [screwfix, bq, travis];
  const results = await Promise.allSettled(adapters.map((fn) => fn({ q })));

  let offers = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) offers = offers.concat(r.value);
  }

  // safety filter
  const f = buildFilter(q);
  const matches = offers.filter((o) => f([o.product, o.pack, o.unit, o.merchant].join(" ")));

  matches.sort((a, b) => a.price - b.price);

  const payload = { offers: matches };
  setCache(key, payload);
  return Response.json(payload);
}
