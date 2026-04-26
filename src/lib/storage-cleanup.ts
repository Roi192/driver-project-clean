import { supabase } from "@/integrations/supabase/client";
import { extractFilePath } from "./storage-utils";

/**
 * Delete files from a storage bucket given their URLs or paths.
 * Silently handles errors to not block the main delete operation.
 */
export async function deleteStorageFiles(
  urls: (string | null | undefined)[],
  bucket: string
): Promise<void> {
  const paths: string[] = [];

  for (const url of urls) {
    if (!url) continue;
    const path = extractFilePath(url, bucket);
    if (path) paths.push(path);
  }

  if (paths.length === 0) return;

  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.error(`Failed to delete files from ${bucket}:`, error);
    }
  } catch (err) {
    console.error(`Error deleting files from ${bucket}:`, err);
  }
}