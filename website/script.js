(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll reveal ---------- */

  const revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = Number(el.dataset.revealDelay ?? 0);
            setTimeout(() => el.classList.add("is-visible"), delay);
            revealObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    revealEls.forEach((el, i) => {
      const groupIndex = i % 6;
      el.dataset.revealDelay = String(groupIndex * 70);
      revealObserver.observe(el);
    });
  }

  /* ---------- Theme toggle ---------- */

  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    const getTheme = () => document.documentElement.getAttribute("data-theme") || "dark";
    const setTheme = (theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
      try {
        localStorage.setItem("pathly-theme", theme);
      } catch {
        // ignore — theme just won't persist across visits
      }
    };

    setTheme(getTheme());

    themeToggle.addEventListener("click", () => {
      setTheme(getTheme() === "light" ? "dark" : "light");
    });
  }

  /* ---------- Mobile menu ---------- */

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  if (menuToggle && mobileMenu) {
    const closeMenu = () => {
      mobileMenu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", () => {
      const willOpen = !mobileMenu.classList.contains("is-open");
      mobileMenu.classList.toggle("is-open", willOpen);
      menuToggle.setAttribute("aria-expanded", String(willOpen));
    });

    mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 640) closeMenu();
    });
  }

  /* ---------- Copy-to-clipboard ---------- */

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const targetSelector = button.getAttribute("data-copy");
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!target) return;

    button.addEventListener("click", async () => {
      const text = target.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      const original = button.dataset.label ?? button.textContent;
      button.dataset.label = original;
      button.textContent = "Copied!";
      button.classList.add("is-copied");
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1600);
    });
  });

  /* ---------- Scrollspy (active nav link) ---------- */

  const navLinks = document.querySelectorAll("[data-nav-link]");
  const sections = Array.from(navLinks)
    .map((link) => {
      const id = link.getAttribute("href")?.replace(/^#/, "");
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
      });
    };

    const spyObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((section) => spyObserver.observe(section));
  }

  /* ---------- Back to top ---------- */

  const backToTop = document.querySelector("[data-back-to-top]");
  if (backToTop) {
    const toggleVisibility = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 600);
    };
    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }
})();
