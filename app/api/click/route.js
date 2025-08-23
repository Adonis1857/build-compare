// app/api/click/route.js
import { withAffiliate } from "@/lib/affiliates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// tiny cookie reader
function getCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

// NO-OP logger for now (no Supabase import)
async function logClickSafe(/* row */) {}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") || "";
  const merchant = searchParams.get("m") || "";
  const q = searchParams.get("q") || "";

  try {
    const u = new URL(to);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad target");

    u.searchParams.set("utm_source", "buildcompare");
    u.searchParams.set("utm_medium", "affiliate");
    if (merchant) u.searchParams.set("utm_campaign", merchant.toLowerCase().replace(/\s+/g, "-"));
    if (q) u.searchParams.set("utm_term", q);

    const finalUrl = withAffiliate(merchant, u.toString());

    let anon = getCookie(req, "bcid");
    if (!anon && typeof crypto?.randomUUID === "function") anon = crypto.randomUUID();

    logClickSafe({
      merchant: merchant || null,
      to_url: finalUrl,
      q: q || null,
      anon_id: anon || null,
      utm_source: "buildcompare",
      utm_medium: "affiliate",
      utm_campaign: merchant ? merchant.toLowerCase().replace(/\s+/g, "-") : null,
      utm_term: q || null,
    });

    const res = Response.redirect(finalUrl, 302);
    if (anon) {
      res.headers.set(
        "Set-Cookie",
        `bcid=${encodeURIComponent(anon)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
      );
    }
    return res;
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }
}
