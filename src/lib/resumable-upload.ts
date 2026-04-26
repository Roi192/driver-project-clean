import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface ResumableUploadOptions {
  bucket: string;
  folder: string;
  file: File;
  onProgress?: (percentage: number) => void;
}

interface UploadResult {
  path: string;
  signedUrl: string;
}

/**
 * Upload a file using TUS resumable upload protocol.
 * This supports files up to 50GB and handles interruptions gracefully.
 * For files <= 6MB, falls back to standard upload for simplicity.
 */
export async function resumableUpload({
  bucket,
  folder,
  file,
  onProgress,
}: ResumableUploadOptions): Promise<UploadResult> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const SIX_MB = 6 * 1024 * 1024;

  // For small files, use standard upload
  if (file.size <= SIX_MB) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 60 * 60 * 24 * 2);

    if (signedError || !signedUrlData?.signedUrl) {
      throw signedError || new Error("Failed to generate signed URL");
    }

    return { path: fileName, signedUrl: signedUrlData.signedUrl };
  }

  // For large files, use TUS resumable upload
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Authentication required for file upload");
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: fileName,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: SIX_MB,
      onError: function (error) {
        console.error("Resumable upload failed:", error);
        reject(error);
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.(percentage);
      },
      onSuccess: async function () {
        try {
          const { data: signedUrlData, error: signedError } =
            await supabase.storage
              .from(bucket)
              .createSignedUrl(fileName, 60 * 60 * 24 * 2);

          if (signedError || !signedUrlData?.signedUrl) {
            reject(signedError || new Error("Failed to generate signed URL"));
            return;
          }

          resolve({ path: fileName, signedUrl: signedUrlData.signedUrl });
        } catch (err) {
          reject(err);
        }
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}