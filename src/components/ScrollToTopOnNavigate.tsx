import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * A new page opens at the top. Links to a spot on a page (#contact) scroll there
 * themselves, filter changes on the same page keep their place, and back/forward
 * leave the browser's own scroll restore alone.
 */
export function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(pathname);

  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (navigationType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, navigationType]);

  return null;
}
