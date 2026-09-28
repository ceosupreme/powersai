import { useEffect } from "react";

const CALM = ".home-offer, .home-contact, .testimonials-section, .website-options, .industry-offer, .industry-questions, .industry-contact, .svc-questions, form, .check-page, .checkout-page";
const TEXT = ".home-eyebrow, .home-hero-v3-kicker, h1, h2, .industry-title";
const BODY = "p, .svc-actions, .websites-hero-actions, .hire-actions";
const VISUAL = ".websites-hero-art, .svc-hero-grid > :last-child, .industry-hero-art, .directory-feature-image, .curated-work-art, .case-lead, .case-full-media figure, .hire-project-image";
const GROUPS = ".home-work-grid, .home-ind-v3-cards, .home-industries-more, .home-process-steps, .websites-process-steps, .svc-work-grid, .brand-system-grid, .systems-process-list, .publish-deliverable-grid, .publish-kit-layout, .directory-featured-grid, .directory-rest-grid, .industry-list, .industry-steps, .industry-feature-list, .about-principles > .studio-container, .hire-projects, .hire-capability-list";

const canAnimate = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function StudioMotion() {
  useEffect(() => {
    if (!canAnimate() || typeof IntersectionObserver === "undefined") return;
    const main = document.querySelector(".stm-studio main");
    if (!main) return;
    const hero = main.querySelector(":scope > section:first-of-type");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).classList.add("studio-motion-enter");
      observer.unobserve(entry.target);
    }), { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    const prepare = (root: ParentNode) => root.querySelectorAll<HTMLElement>(`${TEXT}, ${BODY}, ${VISUAL}, ${GROUPS}`).forEach((node) => {
      if (node.classList.contains("studio-motion-ready") || hero?.contains(node) || node.closest(CALM)) return;
      node.classList.add("studio-motion-ready");
      if (node.matches(BODY)) node.classList.add("studio-motion-delay");
      if (node.matches(VISUAL)) node.classList.add("studio-motion-visual");
      if (node.matches(GROUPS)) {
        node.classList.add("studio-motion-group");
        Array.from(node.children).forEach((child, index) => {
          if (!(child instanceof HTMLElement)) return;
          child.classList.add("studio-motion-child");
          child.style.setProperty("--motion-index", String(Math.min(index, 6)));
        });
      }
      observer.observe(node);
    });
    prepare(main);
    const mutations = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) prepare(node.parentNode ?? main);
    })));
    mutations.observe(main, { childList: true, subtree: true });
    const art = main.querySelector<HTMLElement>(".home-hero-v3-art");
    const depth = () => {
      if (!art || window.innerWidth < 1024 || !canAnimate()) return;
      art.style.setProperty("--hero-depth", `${Math.min(window.scrollY * 0.025, 10)}px`);
    };
    depth();
    window.addEventListener("scroll", depth, { passive: true });
    return () => { observer.disconnect(); mutations.disconnect(); window.removeEventListener("scroll", depth); };
  }, []);
  return null;
}