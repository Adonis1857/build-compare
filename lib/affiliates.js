/* lib/affiliates.js
 *
 * How to configure (Vercel → Environment Variables):
 *
 * Global fallback (optional, monetizes everything while waiting on approvals)
 *   AFF_FALLBACK_TEMPLATE = https://<converter-domain>?key=XYZ&u={url}
 *
 * Merchant-specific (use a TEMPLATE when possible; else use PARAM + ID)
 *   AFF_TOOLSTATION_TEMPLATE      or  AFF_TOOLSTATION_PARAM + AFF_TOOLSTATION_ID
 *   AFF_SCREWFIX_TEMPLATE         or  AFF_SCREWFIX_PARAM + AFF_SCREWFIX_ID
 *   AFF_BQ_TEMPLATE               or  AFF_BQ_PARAM + AFF_BQ_ID
 *   AFF_TREVIS_PERKINS_TEMPLATE   or  AFF_TRAVIS_PERKINS_PARAM + AFF_TRAVIS_PERKINS_ID
 *   AFF_WICKES_TEMPLATE           or  AFF_WICKES_PARAM + AFF_WICKES_ID
 *   AFF_HOMEBASE_TEMPLATE         or  AFF_HOMEBASE_PARAM + AFF_HOMEBASE_ID
 *   AFF_JEWSON_TEMPLATE           or  AFF_JEWSON_PARAM + AFF_JEWSON_ID
 *   AFF_CITY_PLUMBING_TEMPLATE    or  AFF_CITY_PLUMBING_PARAM + AFF_CITY_PLUMBING_ID
 *   AFF_ROOFING_SUPERSTORE_TEMPLATE
 *   AFF_INSULATION_SUPERSTORE_TEMPLATE
 *   AFF_DRAINAGE_SUPERSTORE_TEMPLATE
 *   AFF_MACHINE_MART_TEMPLATE
 *   AFF_BREWERS_TEMPLATE
 *
 * Notes:
 * - TEMPLATE values must include a "{url}" placeholder (we'll URL-encode the target into it).
 * - PARAM/ID form appends e.g. "?affid=XXXX" to the outbound link when a network requires it.
 * - We always fall back to AFF_FALLBACK_TEMPLATE if present; otherwise the raw URL is returned.
 */

const fallbackTemplate = process.env.AFF_FALLBACK_TEMPLATE || "";

// Central config: add merchants here as you onboard them
const cfg = {
  "Toolstation": {
    template: process.env.AFF_TOOLSTATION_TEMPLATE || "",
    param: process.env.AFF_TOOLSTATION_PARAM || "affid",
    id: process.env.AFF_TOOLSTATION_ID || "",
  },
  "Screwfix": {
    template: process.env.AFF_SCREWFIX_TEMPLATE || "",
    param: process.env.AFF_SCREWFIX_PARAM || "affid",
    id: process.env.AFF_SCREWFIX_ID || "",
  },
  "B&Q": {
    template: process.env.AFF_BQ_TEMPLATE || "",
    param: process.env.AFF_BQ_PARAM || "affid",
    id: process.env.AFF_BQ_ID || "",
  },
  "Travis Perkins": {
    template: process.env.AFF_TRAVIS_PERKINS_TEMPLATE || "",
    param: process.env.AFF_TRAVIS_PERKINS_PARAM || "affid",
    id: process.env.AFF_TRAVIS_PERKINS_ID || "",
  },
  "Wickes": {
    template: process.env.AFF_WICKES_TEMPLATE || "",
    param: process.env.AFF_WICKES_PARAM || "affid",
    id: process.env.AFF_WICKES_ID || "",
  },
  "Homebase": {
    template: process.env.AFF_HOMEBASE_TEMPLATE || "",
    param: process.env.AFF_HOMEBASE_PARAM || "affid",
    id: process.env.AFF_HOMEBASE_ID || "",
  },
  "Jewson": {
    template: process.env.AFF_JEWSON_TEMPLATE || "",
    param: process.env.AFF_JEWSON_PARAM || "affid",
    id: process.env.AFF_JEWSON_ID || "",
  },
  "City Plumbing": {
    template: process.env.AFF_CITY_PLUMBING_TEMPLATE || "",
    param: process.env.AFF_CITY_PLUMBING_PARAM || "affid",
    id: process.env.AFF_CITY_PLUMBING_ID || "",
  },
  "Roofing Superstore": {
    template: process.env.AFF_ROOFING_SUPERSTORE_TEMPLATE || "",
  },
  "Insulation Superstore": {
    template: process.env.AFF_INSULATION_SUPERSTORE_TEMPLATE || "",
  },
  "Drainage Superstore": {
    template: process.env.AFF_DRAINAGE_SUPERSTORE_TEMPLATE || "",
  },
  "Machine Mart": {
    template: process.env.AFF_MACHINE_MART_TEMPLATE || "",
  },
  "Brewers Decorator Centres": {
    template: process.env.AFF_BREWERS_TEMPLATE || "",
  },
};

// --- helpers ---

function isHttpUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function applyTemplate(template, targetUrl) {
  // Template must contain {url}; we encode the target once
  return template.replace("{url}", encodeURIComponent(targetUrl));
}

function appendParam(url, key, value) {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

/**
 * Build an affiliate URL for a merchant.
 * Falls back to global converter if merchant not configured.
 * Returns `url` unchanged if no config is available.
 *
 * @param {string} merchant  e.g. "Toolstation"
 * @param {string} url       absolute http(s) URL to the product page
 * @returns {string}         affiliate/converted URL or original url
 */
export function withAffiliate(merchant, url) {
  if (!isHttpUrl(url)) return url;

  const c = cfg[merchant] || {};

  // 1) Template wins (preferred by most networks)
  if (c.template) {
    try { return applyTemplate(c.template, url); } catch { /* ignore */ }
  }

  // 2) param + id style (e.g., ?affid=123)
  if (c.id) {
    try { return appendParam(url, c.param || "affid", c.id); } catch { /* ignore */ }
  }

  // 3) Global fallback converter (e.g., Sovrn/Skimlinks)
  if (fallbackTemplate) {
    try { return applyTemplate(fallbackTemplate, url); } catch { /* ignore */ }
  }

  // 4) Nothing configured — return raw URL
  return url;
}

/**
 * Simple visibility helper (for debugging/admin pages)
 * @param {string} merchant
 * @returns {{hasTemplate:boolean, hasId:boolean, usingFallback:boolean}}
 */
export function affiliateStatus(merchant) {
  const c = cfg[merchant] || {};
  return {
    hasTemplate: !!c.template,
    hasId: !!c.id,
    usingFallback: !c.template && !c.id && !!fallbackTemplate,
  };
}

/**
 * Export list of merchant keys we recognise (for reference)
 */
export const supportedMerchants = Object.keys(cfg);
