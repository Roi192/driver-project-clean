const FILE_PICKER_GUARD_MS = 3_500;
const FILE_UPLOAD_SUCCESS_GUARD_MS = 10 * 60 * 1000;
const FILE_PICKER_MAX_OPEN_MS = 2 * 60 * 1000;

const getBody = () => (typeof document === "undefined" ? null : document.body);

export const markFilePickerOpen = () => {
  const body = getBody();
  if (!body) return;

  const now = Date.now();
  body.dataset.filePickerOpen = "true";
  body.dataset.filePickerOpenedAt = String(now);
  body.dataset.filePickerGuardUntil = String(now + FILE_PICKER_GUARD_MS);
};

export const extendFilePickerGuard = (durationMs = 30_000) => {
  const body = getBody();
  if (!body) return;

  const currentGuardUntil = Number(body.dataset.filePickerGuardUntil || 0);
  const nextGuardUntil = Date.now() + durationMs;
  body.dataset.filePickerOpen = "true";
  body.dataset.filePickerGuardUntil = String(Math.max(currentGuardUntil, nextGuardUntil));
};

export const markFilePickerClosed = () => {
  const body = getBody();
  if (!body) return;

  body.dataset.filePickerOpen = "false";
};

export const isFilePickerGuardActive = () => {
  const body = getBody();
  if (!body) return false;

  const openedAt = Number(body.dataset.filePickerOpenedAt || 0);
  const guardUntil = Number(body.dataset.filePickerGuardUntil || 0);
  const pickerLikelyOpen =
    body.dataset.filePickerOpen === "true" &&
    openedAt > 0 &&
    Date.now() - openedAt < FILE_PICKER_MAX_OPEN_MS;

  return pickerLikelyOpen || guardUntil > Date.now();
};

export const clearFilePickerState = () => {
  const body = getBody();
  if (!body) return;

  delete body.dataset.filePickerOpen;
  delete body.dataset.filePickerOpenedAt;
  delete body.dataset.filePickerGuardUntil;
  delete body.dataset.filePickerClearToken;
};

export const scheduleFilePickerGuardClear = (delayMs = FILE_PICKER_GUARD_MS) => {
  const body = getBody();
  if (!body || typeof window === "undefined") return;

  const token = `${Date.now()}-${Math.random()}`;
  body.dataset.filePickerClearToken = token;

  window.setTimeout(() => {
    const currentBody = getBody();
    if (!currentBody || currentBody.dataset.filePickerClearToken !== token) return;

    const openedAt = Number(currentBody.dataset.filePickerOpenedAt || 0);
    const pickerLikelyStillOpen =
      currentBody.dataset.filePickerOpen === "true" &&
      openedAt > 0 &&
      Date.now() - openedAt < FILE_PICKER_MAX_OPEN_MS;

    if (pickerLikelyStillOpen) {
      scheduleFilePickerGuardClear(FILE_PICKER_GUARD_MS);
      return;
    }

    const guardUntil = Number(currentBody.dataset.filePickerGuardUntil || 0);
    if (guardUntil > Date.now()) {
      scheduleFilePickerGuardClear(guardUntil - Date.now() + 100);
      return;
    }

    clearFilePickerState();
  }, delayMs);
};

export const keepFilePickerGuardAfterSuccessfulUpload = () => {
  extendFilePickerGuard(FILE_UPLOAD_SUCCESS_GUARD_MS);
};