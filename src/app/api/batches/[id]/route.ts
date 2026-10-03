import { jsonError, loadBatchDTO, parseId } from "@/lib/server-helpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה אצווה לא תקין");
  const batch = await loadBatchDTO(id);
  if (!batch) return jsonError("האצווה לא נמצאה", 404);
  return NextResponse.json({ serverTime: new Date().toISOString(), batch });
}
