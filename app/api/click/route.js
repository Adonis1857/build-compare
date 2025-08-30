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

function safeDecodeURIComponent(url) {
  try {
    let decoded = decodeURIComponent(url);
    if (decoded !== decodeURIComponent(decoded)) {
      decoded = decodeURIComponent(decoded);
    }
    return decoded;
  } catch (error) {
    console.warn("Failed to decode URL, using original:", url);
    return url;
  }
}

// +++ NEW FUNCTION: Add UTM parameters manually without using URL object +++
function addUtmParameters(url, merchant, q) {
  // Check if the URL already has query parameters
  const hasExistingParams = url.includes('?');
  const separator = hasExistingParams ? '&' : '?';
  
  // Start building the new URL with UTM parameters
  let newUrl = url + separator + 'utm_source=buildcompare&utm_medium=affiliate';
  
  // Add merchant if available
  if (merchant) {
    const campaign = merchant.toLowerCase().replace(/\s+/g, '-');
    newUrl += '&utm_campaign=' + encodeURIComponent(campaign);
  }
  
  // Add search query if available
  if (q) {
    newUrl += '&utm_term=' + encodeURIComponent(q);
  }
  
  return newUrl;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let to = searchParams.get("to") || "";
  const merchant = searchParams.get("m") || "";
  const q = searchParams.get("q") || "";

  to = safeDecodeURIComponent(to);
  console.log("Decoded URL:", to);

  try {
    // +++ BASIC VALIDATION: Check if it looks like a valid HTTP/HTTPS URL +++
    if (!to.startsWith('http://') && !to.startsWith('https://')) {
      throw new Error("Invalid URL protocol");
    }

    // +++ Add UTM parameters using string manipulation instead of URL object +++
    let finalUrl = addUtmParameters(to, merchant, q);
    
    // Apply merchant-specific affiliate tracking
    finalUrl = withAffiliate(merchant, finalUrl);
    console.log("Final URL with UTM and affiliate:", finalUrl);

    // anonymous visitor id cookie (1 year)
    let anon = getCookie(req, "bcid");
    if (!anon) anon = genAnonId();

    // fire-and-forget DB insert
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
    } catch (dbError) {
      console.error("Database error:", dbError);
    }

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
    console.error("Error in /api/click:", error.message);
    return new Response("Invalid URL: " + error.message, { status: 400 });
  }
}
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  
  // 🔥 CRITICAL: Add these no-cache headers to fix "immutable" error
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store'
  };
  
  try {
    // Your existing UTM parameter logic - DON'T CHANGE THIS
    const finalUrl = buildAffiliateUrl(targetUrl);
    
    // Return redirect WITH the cache prevention headers
    return new Response(null, {
      status: 302,
      headers: {
        ...headers,
        'Location': finalUrl,
      },
    });
  } catch (error) {
    console.error('Error in /api/click:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
  }
}
