import { createRoot, hydrateRoot } from "react-dom/client";
import { dehydrate, hydrate } from "@tanstack/react-query";
import App from "./App.tsx";
import { queryClient } from "@/lib/queryClient";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");

// Published pages arrive as a saved copy (scripts/prerender-pages.py). The copy only belongs to the
// address it was saved for: the homepage file also answers addresses that have no saved copy.
const here = window.location.pathname.replace(/\/+$/, "") || "/";
const savedHere = root.getAttribute("data-saved-path") === here;

// Saved pages carry the data they were drawn with, so the first draw here matches the saved copy.
const saved = savedHere ? document.getElementById("stm-query-state")?.textContent : null;
if (saved) {
  try { hydrate(queryClient, JSON.parse(saved)); } catch { /* fall back to a fresh load */ }
}
// The page-saving step at publish reads this to store each page's data with it.
(window as unknown as { __STM_DEHYDRATE__?: () => unknown }).__STM_DEHYDRATE__ = () =>
  dehydrate(queryClient, { shouldDehydrateQuery: (query) => query.state.status === "success" });

if (savedHere && root.hasAttribute("data-hydrate")) {
  hydrateRoot(root, <App />, {
    // If this visit draws something different from the saved copy (a filter in the link, say),
    // React quietly draws the page fresh. The count lets the publish checks see it happen.
    onRecoverableError: (error) => {
      const w = window as unknown as { __STM_REDRAWS__?: number };
      w.__STM_REDRAWS__ = (w.__STM_REDRAWS__ ?? 0) + 1;
      if (import.meta.env.DEV) console.warn("[saved page redrawn]", error);
    },
  });
} else {
  createRoot(root).render(<App />);
}
