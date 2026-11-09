/**
 * Link previews for unlisted client proposals (/proposal/:slug).
 * When a proposal link is texted, emailed or posted, apps read the page's
 * og:image, title and description from the HTML the server sends. The publish
 * build (scripts/prerender-meta.mjs) writes these into each proposal's HTML so
 * the preview shows the client's own card instead of the homepage hero.
 * Images live in public/og/ (crawlable), 1200 x 630. Make new cards with
 * scripts/share-card/render.py. Proposal pages stay noindex.
 */
export const PROPOSAL_SHARE = {
  "cpn-growth": {
    title: "CPN Growth Proposal for Erik and Mike | Supreme Team Media",
    description: "More owners in your room every week. We handle the calls and booking. Watch the video and compare the three packages.",
    image: "/og/proposal-cpn-growth.jpg",
  },
  keegan: {
    title: "Keegan's Growth Program | Supreme Team Media",
    description: "More leads, warmer leads, more closed business. Watch the plan in under five minutes, then approve it on the page.",
    image: "/og/proposal-keegan.jpg",
  },
  finca: {
    title: "Finca Growth Program | Supreme Team Media",
    description: "More people find Finca. More of them come back. More per head. See the plan, the first 30 days and the price.",
    image: "/og/proposal-finca.jpg",
  },
};
