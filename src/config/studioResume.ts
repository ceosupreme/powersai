/**
 * Résumé availability for /hire.
 *
 * A download button renders ONLY when an approved real PDF exists in the
 * deployable project (place it in `public/` and point `file` at it, e.g.
 * "/sean-mayo-resume.pdf"). While `file` is null the page shows the
 * "Request résumé" email fallback instead — never a dead download and never an
 * external sandbox URL.
 */
export const STUDIO_RESUME: { file: string | null; label: string; downloadName: string } = {
  file: "/sean-mayo-resume.pdf",
  label: "Download résumé",
  downloadName: "sean-mayo-resume.pdf",
};

export const RESUME_REQUEST_MAILTO =
  "mailto:ceosupreme@gmail.com" +
  "?subject=" +
  encodeURIComponent("Résumé request — Sean Mayo") +
  "&body=" +
  encodeURIComponent(
    "Hi Sean,\n\nI'd like to review your résumé for a role or contract. Here's a little about the position:\n\n",
  );
