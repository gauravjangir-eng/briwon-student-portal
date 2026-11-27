import "server-only";
import { randomUUID } from "node:crypto";
import type { Supa } from "@/lib/queries";
import { FILE_RULES, safeFileName, validateFile } from "@/lib/validation";

export type Bucket = "student-files" | "course-files" | "admin-files";

/**
 * Validates and uploads a file using the caller's session (storage RLS applies).
 * Returns the storage path, or an error message.
 */
export async function uploadFile(supabase: Supa, bucket: Bucket, folder: string, file: File, allowed?: string[]) {
  const problem = validateFile(file, allowed);
  if (problem) return { error: problem } as const;
  const ext = FILE_RULES.types[file.type];
  const path = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeFileName(file.name)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[storage]", error);
    return { error: "Upload failed. You may not have permission to upload here." } as const;
  }
  return { path } as const;
}

export const fileUrl = (bucket: Bucket, path: string | null | undefined) =>
  path ? `/api/files?bucket=${bucket}&path=${encodeURIComponent(path)}` : null;

export function getFile(formData: FormData, name = "file") {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}
