window.__pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
});
