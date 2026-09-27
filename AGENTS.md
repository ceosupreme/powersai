# Project architecture rules

- Public-site media replacements use named entries in `src/config/studioMedia.ts`; do not build media-management UI or storage because the owner replaces assets through conversation uploads.
- Published version-2 industry navigation reads through `usePublishedVerticalLanders`; do not maintain a second hard-coded market list because database rows are authoritative.
- The Websites sales route owns its six-section layout in `src/pages/WebsiteServices.tsx` and reuses `OfferSection` and `Inquiry`; this preserves existing checkout and lead handling without duplicating business logic.
- Published V2 industry pages render the database `layout.sequence` and `layout.interaction` in the shared homepage visual system; keep copy and ordering row-driven so markets and Spanish overrides stay editable without per-market branches.
- Brand and Marketing sales routes own their six-section layouts in their respective page files and share `Inquiry`'s servicePage context; this keeps their distinct compositions independent while preserving one lead workflow.
- Systems and Publishing sales routes own their six-section layouts and share `Inquiry`'s servicePage context; this keeps their workflow and product compositions distinct without duplicating lead handling.
- Industries reads published V2 rows including layout media and interaction for its visual directory; Work uses the published-project adapter and URL `type` filters so neither page duplicates editorial data.
- Local Vite proxies only Lovable CDN asset paths to this project's preview host; otherwise media pointers return the Vite HTML fallback instead of images during local visual QA.