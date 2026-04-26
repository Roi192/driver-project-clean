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

  var deferred = null;
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

  if (isStandalone) {
    // Already installed & running as app → redirect to auth
    window.location.replace(c.authPath);
    return;
  }

  if (isIOS) {
    if ($ios) $ios.hidden = false;
    if ($manual) $manual.hidden = true;
    if ($status) $status.textContent = "עקוב אחר ההוראות למטה להתקנה.";
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if ($install) { $install.hidden = false; $install.classList.add("pulse"); }
    if ($manual) $manual.hidden = true;
    if ($status) $status.textContent = "";
  });

  window.addEventListener("appinstalled", function () { showInstalled(); });

  if ($install) {
    $install.addEventListener("click", async function () {
      if (!deferred) return;
      $install.textContent = "מתקין…";
      await deferred.prompt();
      var choice = await deferred.userChoice;
      deferred = null;
      if (choice.outcome === "accepted") showInstalled();
      else $install.textContent = c.installLabel || "התקן את האפליקציה";
    });
  }
})();