import { useEffect, type RefObject } from "react";

/**
 * A group further down the page dims until it scrolls into view, then lights up once (CSS does the
 * look: `[data-armed="1"]` is the dim state, `.is-lit` the switched-on state). Visible by default:
 * nothing is dimmed without JavaScript, under reduced motion, or when the group is already on screen
 * when it first appears. Pass `ready` once the group has content, if it loads after the page opens.
 */
export function useArmOnScroll(ref: RefObject<HTMLElement | null>, ready = true) {
  useEffect(() => {
    const el = ref.current;
    if (!ready || !el || el.classList.contains("is-lit") || typeof IntersectionObserver === "undefined") return;
    if (!el.dataset.armed) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.dataset.armed = "1";
    }
    // Lights once the group's top is well into view. A share-of-the-group threshold would never be
    // reached by a group taller than the screen (four stacked cards on a phone).
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      el.classList.add("is-lit");
      io.disconnect();
    }, { threshold: 0, rootMargin: "0px 0px -18% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, ready]);
}
