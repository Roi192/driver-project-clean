(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-push.js').catch(function () {});
  }

  var c = window.__INSTALL_CONFIG__;
  if (!c) return;

  var $install  = document.getElementById("install-button");
  var $manual   = document.getElementById("manual-panel");
  var $ios      = document.getElementById("ios-panel");
  var $status   = document.getElementById("status-text");
  var $features = document.getElementById("features-section");
  var $installed= document.getElementById("installed-banner");

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  var isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  try { localStorage.setItem("install_department", c.department); } catch {}
  document.title = c.pageTitle;

  function showInstalled() {
    if ($install)   $install.hidden = true;
    if ($manual)    $manual.hidden = true;
    if ($ios)       $ios.hidden = true;
    if ($features)  $features.hidden = true;
    if ($installed) $installed.hidden = false;
    if ($status) {
      $status.textContent = "פתח את האפליקציה מהמסך הראשי של הטלפון.";
      $status.classList.add("success");
    }
  }

  function showPromptButton() {
    if ($install)  { $install.hidden = false; $install.classList.add("pulse"); }
    if ($manual)   $manual.hidden = true;
    if ($status)   $status.textContent = "";
  }

  if (isStandalone) {
    window.location.replace(c.authPath);
    return;
  }

  if (isIOS) {
    if ($ios)    $ios.hidden = false;
    if ($manual) $manual.hidden = true;
    if ($status) $status.textContent = "עקוב אחר ההוראות למטה להתקנה.";
    return;
  }

  // Check if prompt was already captured by the inline script before defer ran
  if (window.__installDeferred) {
    showPromptButton();
  }

  // Also listen for prompt that fires after this script runs
  window.addEventListener('__promptReady', function() {
    showPromptButton();
  });

  // Do NOT listen to appinstalled — it fires spuriously (e.g. on revisit after deletion)
  // Only mark installed after the user explicitly accepts via prompt

  if ($install) {
    $install.addEventListener("click", async function () {
      var deferred = window.__installDeferred;
      if (!deferred) return;
      $install.textContent = "מתקין…";
      $install.disabled = true;
      try {
        await deferred.prompt();
        var choice = await deferred.userChoice;
        window.__installDeferred = null;
        if (choice.outcome === "accepted") {
          showInstalled();
        } else {
          // User dismissed — reset so they can try again later
          $install.textContent = c.installLabel || "התקן את האפליקציה";
          $install.disabled = false;
        }
      } catch (err) {
        $install.textContent = c.installLabel || "התקן את האפליקציה";
        $install.disabled = false;
      }
    });
  }
})();
