// Scrollové animace — GSAP + ScrollTrigger. Bez knihoven se jen vrátíme
// a CSS třída is-visible zajistí, že obsah zůstane viditelný.
export function initAnimations() {
  if (!window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  document.querySelectorAll('.reveal').forEach((el) => {
    window.gsap.fromTo(el,
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onStart: () => el.classList.add('is-visible'),
      }
    );
  });

  // Karty služeb: jemný kaskádový vstup
  window.gsap.fromTo('.service-card',
    { opacity: 0, y: 40 },
    {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.service-grid', start: 'top 80%', once: true },
    }
  );
}
