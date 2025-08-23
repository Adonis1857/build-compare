export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // disable caching

export async function GET() {
  // Booleans (no secrets)
  const okUrl = !!process.env.SUPABASE_URL;
  const okKey = !!process.env.SUPABASE_SERVICE_ROLE;
  const okFallback = !!process.env.AFF_FALLBACK_TEMPLATE;

  // Extra context to spot issues
  const vercelEnv = process.env.VERCEL_ENV || "unknown"; // "production" | "preview" | "development"
  const runtimeType = "nodejs";
  const varNamesSeen = Object.keys(process.env)
    .filter((k) => /^(SUPABASE_|AFF_|VERCEL_ENV$)/.test(k))
    .sort();

  return Response.json({
    supabaseUrlPresent: okUrl,
    supabaseServiceRolePresent: okKey,
    affFallbackPresent: okFallback,
    vercelEnv,
    runtimeType,
    varNamesSeen // names only, no values
  });
}
