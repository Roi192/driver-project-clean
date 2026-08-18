const DRAFT_KEY_PREFIX = "shift_photos_draft";

export type PhotosDraftMap = Record<string, string | undefined>;

export function saveShiftPhotosDraft(userId: string | undefined, state: PhotosDraftMap) {
  if (!userId) return;
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}:${userId}`, JSON.stringify(state));
  } catch {}
}

export function loadShiftPhotosDraft(userId: string | undefined): PhotosDraftMap {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}:${userId}`);
    return raw ? (JSON.parse(raw) as PhotosDraftMap) : {};
  } catch {
    return {};
  }
}

export function clearShiftPhotosDraft(userId: string | undefined) {
  if (!userId) return;
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}:${userId}`);
  } catch {}
}
