import { Capacitor } from "@capacitor/core";

/**
 * Check if we're running inside a native Capacitor shell (Android/iOS).
 * When true we should use the Capacitor Camera plugin instead of <input type="file">.
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Take a photo using the Capacitor Camera plugin.
 * Returns a File object ready for upload, or null if cancelled.
 */
export const takePhotoNative = async (): Promise<File | null> => {
  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );

    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Let user choose camera or gallery
      width: 1920,
      height: 1920,
      correctOrientation: true,
      promptLabelHeader: "בחר מקור תמונה",
      promptLabelPhoto: "גלריה",
      promptLabelPicture: "מצלמה",
      promptLabelCancel: "ביטול",
    });

    if (!image.dataUrl) {
      console.warn("[CapCamera] No dataUrl returned");
      return null;
    }

    // Convert data URL to File
    const response = await fetch(image.dataUrl);
    const blob = await response.blob();
    const extension = image.format || "jpeg";
    const fileName = `photo_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, {
      type: `image/${extension === "jpg" ? "jpeg" : extension}`,
    });

    console.log("[CapCamera] Photo captured", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    return file;
  } catch (error: unknown) {
    // User cancelled
    if (
      error instanceof Error &&
      (error.message.includes("cancelled") ||
        error.message.includes("canceled") ||
        error.message.includes("User cancelled"))
    ) {
      console.log("[CapCamera] User cancelled photo capture");
      return null;
    }
    console.error("[CapCamera] Error taking photo:", error);
    throw error;
  }
};