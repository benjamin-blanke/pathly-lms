(() => {
  try {
    const stored = localStorage.getItem("pathly-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch {
    // localStorage unavailable (private mode, etc) — fall back to the default dark theme.
  }
})();
