export const runtime = "nodejs";

import { search as screwfix } from "@/lib/adapters/screwfix";
import { search as bq } from "@/lib/adapters/bq";
import { search as travis } from "@/lib/adapters/travis";
import { search as toolstation } from "@/lib/adapters/toolstation";
import { search as jewson } from "@/lib/adapters/jewson";

// tiny cache
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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const debugMode = searchParams.get("debug") === "1";

  const key = JSON.stringify({ q });
  const cached = !debugMode && getCache(key);
  if (cached) return Response.json(cached);

  if (!q) return Response.json({ offers: [] });

  const defs = [
    { name: "Screwfix", fn: screwfix, env: "FEED_SCREWFIX_URL" },
    { name: "B&Q", fn: bq, env: "FEED_BQ_URL" },
    { name: "Travis Perkins", fn: travis, env: "FEED_TRAVIS_URL" },
    { name: "Toolstation", fn: toolstation, env: "FEED_TOOLSTATION_URL" },
    { name: "Jewson", fn: jewson, env: "FEED_JEWSON_URL" },
  ];

  const settled = await Promise.allSettled(defs.map(d => d.fn({ q })));

  let offers = [];
  const dbg = [];

  settled.forEach((r, i) => {
    const d = defs[i];
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      offers = offers.concat(r.value);
      if (debugMode) dbg.push({
        adapter: d.name,
        envPresent: !!process.env[d.env],
        count: r.value.length,
        sample: r.value[0] || null,
      });
    } else {
      if (debugMode) dbg.push({
        adapter: d.name,
        envPresent: !!process.env[d.env],
        error: String(r.reason || "unknown error"),
      });
    }
  });

  const filter = buildFilter(q);
  const matches = offers.filter(o => filter([o.product, o.pack, o.unit, o.merchant].join(" ")));
  matches.sort((a, b) => a.price - b.price);

  const payload = debugMode ? { offers: matches, debug: dbg } : { offers: matches };
  if (!debugMode) setCache(key, payload);
  return Response.json(payload);
}

