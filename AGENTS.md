# Project architecture rules

- Public-site media replacements use named entries in `src/config/studioMedia.ts`; do not build media-management UI or storage because the owner replaces assets through conversation uploads.
- Published version-2 industry navigation reads through `usePublishedVerticalLanders`; do not maintain a second hard-coded market list because database rows are authoritative.