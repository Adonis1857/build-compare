export const runtime = "nodejs";

export async function GET() {
  const okUrl = !!process.env.SUPABASE_URL;
  const okKey = !!process.env.SUPABASE_SERVICE_ROLE;
  const okFallback = !!process.env.AFF_FALLBACK_TEMPLATE; // optional
  return Response.json({
    supabaseUrlPresent: okUrl,
    supabaseServiceRolePresent: okKey,
    affFallbackPresent: okFallback
  });
}
