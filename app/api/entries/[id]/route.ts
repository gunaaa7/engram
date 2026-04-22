import { NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/entries/[id]">,
) {
  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return jsonError("Entry not found.", 404);
  }

  const supabase = createServiceSupabaseClient();

  const { data: existingEntry, error: lookupError } = await supabase
    .from("entries")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    console.error("DELETE /api/entries/[id] failed during lookup:", lookupError);
    return jsonError("Failed to look up entry.", 500);
  }

  if (!existingEntry) {
    return jsonError("Entry not found.", 404);
  }

  const { error: deleteError } = await supabase.from("entries").delete().eq("id", id);

  if (deleteError) {
    console.error("DELETE /api/entries/[id] failed during delete:", deleteError);
    return jsonError("Failed to delete entry.", 500);
  }

  return NextResponse.json({ success: true });
}
