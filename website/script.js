(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = Number(el.dataset.revealDelay ?? 0);
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );

  revealEls.forEach((el, i) => {
    const groupIndex = i % 6;
    el.dataset.revealDelay = String(groupIndex * 70);
    observer.observe(el);
  });
})();
