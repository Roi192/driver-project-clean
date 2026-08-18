const log = (event: string, data?: Record<string, unknown>) =>
  console.log(`[ShiftCamera] ${event}`, data ?? "");

export const CameraLog = {
  cameraRequested: () => log("camera_requested"),
  streamStarted: (facingMode: string) => log("camera_stream_started", { facingMode }),
  cameraReady: (w: number, h: number) => log("camera_ready", { width: w, height: h }),
  captureStarted: () => log("capture_started"),
  blobCreated: (size: number, type: string) => log("capture_blob_created", { size, type }),
  uploadStarted: (photoId: string, fileSize: number) =>
    log("upload_started", { photoId, fileSize }),
  uploadSuccess: (photoId: string, path: string) => log("upload_success", { photoId, path }),
  uploadFailed: (photoId: string, error: string) => log("upload_failed", { photoId, error }),
  nativeFallbackStarted: () => log("native_fallback_started"),
  nativeFileReceived: (name: string, size: number, type: string) =>
    log("native_file_received", { name, size, type }),
};
