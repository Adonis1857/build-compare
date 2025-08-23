import { supa } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supa
      .from("clicks")
      .select("*")
      .order("ts", { ascending: false })
      .limit(50);
    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (e) {
    return Response.json({ items: [], error: String(e) }, { status: 500 });
  }
}
