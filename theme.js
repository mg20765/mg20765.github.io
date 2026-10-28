// Light and dark mode. The first visit follows the device setting; after
// that the visitor's choice is remembered. Browsers can block storage, so
// every read and write is wrapped and the toggle still works without it.
(function () {
  var root = document.documentElement;
  var KEY = "mg_theme";

  function saved() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function deviceTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var button = document.querySelector(".theme-toggle");
    if (button) button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  apply(saved() || deviceTheme());

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.querySelector(".theme-toggle");
    if (!button) return;
    apply(root.getAttribute("data-theme"));
    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try {
        window.localStorage.setItem(KEY, next);
      } catch (e) {
        /* storage blocked: the choice just lasts for this page */
      }
    });
  });
})();
