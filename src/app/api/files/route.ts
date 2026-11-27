import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const BUCKETS = new Set(["student-files", "course-files", "admin-files"]);

/** Issues a 60-second signed URL after storage RLS confirms the caller may read the file. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const bucket = request.nextUrl.searchParams.get("bucket") ?? "";
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!BUCKETS.has(bucket) || !path || path.includes("..")) return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
