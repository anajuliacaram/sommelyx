import { useEffect, type RefObject } from "react";

/**
 * Wires the V6 landing micro-interactions, ported 1:1 from the approved
 * prototype script: scroll reveal, navbar scrolled state + scroll-spy,
 * single-open FAQ accordion and hero pointer parallax.
 *
 * Everything is gated by prefers-reduced-motion.
 */
export function useLandingV6Motion(rootRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    /* Scroll reveal */
    const revealEls = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("in-view"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in-view");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      revealEls.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    /* Nav scrolled state + scroll-spy active link */
    const nav = root.querySelector<HTMLElement>(".nav");
    const spyLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>(".nav-links a[data-spy]"));
    const sections = spyLinks
      .map((a) => root.querySelector<HTMLElement>(`#${a.getAttribute("data-spy")}`))
      .filter((s): s is HTMLElement => Boolean(s));

    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
      const line = window.innerHeight * 0.38;
      let current: string | null = null;
      sections.forEach((sec) => {
        if (sec.getBoundingClientRect().top <= line) current = sec.id;
      });
      spyLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("data-spy") === current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    /* FAQ accordion — single open */
    const items = Array.from(root.querySelectorAll<HTMLDetailsElement>(".faq-item"));
    const toggleHandlers: Array<[HTMLDetailsElement, () => void]> = [];
    items.forEach((item) => {
      const handler = () => {
        if (item.open) items.forEach((other) => other !== item && (other.open = false));
      };
      item.addEventListener("toggle", handler);
      toggleHandlers.push([item, handler]);
    });
    cleanups.push(() => toggleHandlers.forEach(([el, h]) => el.removeEventListener("toggle", h)));

    /* Hero pointer parallax */
    if (!reduce) {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".hero-stage .gcard"));
      let raf: number | null = null;
      let tx = 0;
      let ty = 0;
      const apply = () => {
        cards.forEach((c) => {
          const depth = parseFloat(c.getAttribute("data-depth") || "12");
          c.style.setProperty("--px", `${tx * depth}px`);
          c.style.setProperty("--py", `${ty * depth}px`);
        });
        raf = null;
      };
      const onPointer = (e: PointerEvent) => {
        tx = (e.clientX / window.innerWidth - 0.5) * -0.6;
        ty = (e.clientY / window.innerHeight - 0.5) * -0.6;
        if (!raf) raf = requestAnimationFrame(apply);
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onPointer);
        if (raf) cancelAnimationFrame(raf);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [rootRef]);
}
