import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useLandingMotion(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!root.current) return;
    const mm = gsap.matchMedia(root);
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current).forEach((el) => {
        gsap.from(el, {
          y: 32,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 96%", once: true },
        });
      });
      gsap.fromTo(
        ".intro-rule",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".intro",
            start: "top 85%",
            end: "bottom 70%",
            scrub: true,
          },
        },
      );
      gsap.fromTo(
        ".window-scenery",
        { y: -20 },
        {
          y: 18,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-day-preview",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    });
    let frame = 0;
    const refresh = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        ScrollTrigger.refresh();
      });
    };
    const observer = new ResizeObserver(refresh);
    const page = root.current.closest(".landing-page");
    page?.querySelectorAll(".band,.photo-collections,.intro").forEach((el) => {
      observer.observe(el);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mm.revert();
    };
  }, [root]);
}
