// app/api/click/route.js
import { withAffiliate } from "@/lib/affiliates";
import { supa } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// tiny cookie reader
function getCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

// generate a stable anonymous id safely in all runtimes
function genAnonId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {}
  // fallback
  return "bc_" + Math.random().toString(36).slice(2, 10);
}

// +++ NEW FUNCTION: Safely decode a potentially double-encoded URL +++
function safeDecodeURIComponent(url) {
  try {
    // Try to decode the URL
    let decoded = decodeURIComponent(url);
    // Check if it still contains encoded characters (meaning it was double-encoded)
    if (decoded !== decodeURIComponent(decoded)) {
      // If it does, decode it again
      decoded = decodeURIComponent(decoded);
    }
    return decoded;
  } catch (error) {
    // If decoding fails, return the original URL
    console.warn("Failed to decode URL, using original:", url);
    return url;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let to = searchParams.get("to") || "";
  const merchant = searchParams.get("m") || "";
  const q = searchParams.get("q") || "";

  // +++ Use the safe decode function +++
  to = safeDecodeURIComponent(to);
  console.log("Decoded URL:", to); // This will help us debug

  try {
    const u = new URL(to);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad target");

    // Add first-party UTMs for your own analytics
    u.searchParams.set("utm_source", "buildcompare");
    u.searchParams.set("utm_medium", "affiliate");
    if (merchant) u.searchParams.set("utm_campaign", merchant.toLowerCase().replace(/\s+/g, "-"));
    if (q) u.searchParams.set("utm_term", q);

    // Apply merchant-specific template or global fallback (if configured)
    const finalUrl = withAffiliate(merchant, u.toString());

    // anonymous visitor id cookie (1 year)
    let anon = getCookie(req, "bcid");
    if (!anon) anon = genAnonId();

    // fire-and-forget DB insert (don’t block the redirect)
    try {
      supa
        .from("clicks")
        .insert({
          merchant: merchant || null,
          to_url: finalUrl,
          q: q || null,
          anon_id: anon || null,
          utm_source: "buildcompare",
          utm_medium: "affiliate",
          utm_campaign: merchant ? merchant.toLowerCase().replace(/\s+/g, "-") : null,
          utm_term: q || null,
        })
        .then(() => {})
        .catch(() => {});
    } catch {}

    // redirect and set cookie
    const res = Response.redirect(finalUrl, 302);
    if (anon) {
      res.headers.set(
        "Set-Cookie",
        `bcid=${encodeURIComponent(anon)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
      );
    }
    return res;
  } catch (error) {
    // +++ Better error logging +++
    console.error("Error in /api/click:", error.message);
    return new Response("Invalid URL: " + error.message, { status: 400 });
  }
}
