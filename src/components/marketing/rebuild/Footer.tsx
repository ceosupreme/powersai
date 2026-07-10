import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center md:px-10">
        <div className="font-display text-base text-foreground">Supreme Team Media</div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <a href="#contact" className="hover:text-foreground">Contact</a>
          <Link to="/free-audit" className="hover:text-foreground">Free checkup</Link>
          <Link to="/auth" className="hover:text-foreground">Log in</Link>
          <span className="text-muted-foreground/70">&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}