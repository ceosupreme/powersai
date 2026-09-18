import { Link } from "react-router-dom";
import { Container } from "./primitives";

/** Every link here points at a real, implemented route — never a dead link. */
export function StudioFooter() {
  return (
    <footer className="studio-band">
      <Container className="py-16 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="studio-display text-2xl">Supreme Team Media</p>
            <p className="mt-3 text-[1rem] text-muted-foreground">Creative. Marketing. Technology.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-4 text-[1rem] sm:grid-cols-3">
            <Link to="/work" className="hover:underline">Work</Link>
            <Link to="/services/websites" className="hover:underline">Websites</Link>
            <Link to="/services/brand" className="hover:underline">Brand &amp; creative</Link>
            <Link to="/services/marketing" className="hover:underline">Marketing &amp; growth</Link>
            <Link to="/services/ai-systems" className="hover:underline">AI &amp; systems</Link>
            <Link to="/publishing" className="hover:underline">Publishing &amp; Launch</Link>
            <Link to="/#about" className="hover:underline">About</Link>
            <Link to="/#contact" className="hover:underline">Discuss a project</Link>
            <Link to="/free-audit" className="hover:underline">Free business checkup</Link>
            <Link to="/hire" className="hover:underline">Hiring Sean?</Link>
            <Link to="/login" className="hover:underline">Client login</Link>
            <a
              href="https://www.linkedin.com/in/sean-mayo-3055aa287/"
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              LinkedIn
            </a>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[hsl(var(--band-text)/0.16)] pt-6 text-sm text-muted-foreground md:flex-row md:justify-between">
          <span>&copy; {new Date().getFullYear()} Supreme Team Media</span>
          <a href="mailto:hello@supremeteammedia.com" className="hover:underline">
            hello@supremeteammedia.com
          </a>
        </div>
      </Container>
    </footer>
  );
}
