import { cn } from "@/lib/utils";
import type { HTMLAttributes, PropsWithChildren } from "react";

export function MonoLabel({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn(
        "text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={cn("eyebrow", className)}>{children}</span>;
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full bg-accent live-dot", className)}
      aria-hidden
    />
  );
}

export function Panel({
  className,
  children,
  as: As = "div",
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }>) {
  return (
    <As
      {...rest}
      className={cn("relative rounded-md border border-border bg-panel/80 backdrop-blur-sm", className)}
    >
      {children}
    </As>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display mt-5 text-balance text-3xl leading-[1.05] tracking-tight text-foreground md:text-[2.75rem] lg:text-5xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {sub}
        </p>
      )}
    </div>
  );
}

export function Container({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-20", className)}>
      {children}
    </div>
  );
}