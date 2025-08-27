// app/api/search/route.js
export const runtime = "nodejs";

import merchantsCfg from "@/lib/adapters/merchants.json";
import { search as travis } from "@/lib/adapters/travis";
import { parseQuery } from "@/lib/search/parse";

const registry = { "Travis Perkins": travis };

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();
  const debugMode = searchParams.get("debug") === "1";
  if (!qRaw) return Response.json({ offers: [] });

  const q = (parseQuery(qRaw)).normalized;

  const defs = (merchantsCfg?.merchants || [])
    .filter((m) => m.enabled)
    .map((m) => ({ name: m.name, env: m.env, fn: registry[m.name] }))
    .filter((d) => typeof d.fn === "function");

  const settled = await Promise.allSettled(defs.map((d) => d.fn({ q })));

  let offers = [];
  const dbg = [];

  settled.forEach((r, i) => {
    const d = defs[i];
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      offers = offers.concat(r.value);
      if (debugMode) dbg.push({ adapter: d.name, envPresent: !!process.env[d.env], count: r.value.length, sample: r.value[0] || null });
    } else {
      if (debugMode) dbg.push({ adapter: d.name, envPresent: !!process.env[d.env], error: String(r.reason || "unknown error") });
    }
  });

  offers.sort((a, b) => (Number.isFinite(a.price) ? a.price : Infinity) - (Number.isFinite(b.price) ? b.price : Infinity));
  return Response.json(debugMode ? { offers, debug: dbg } : { offers });
}
