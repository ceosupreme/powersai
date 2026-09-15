import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("studio-container", className)}>{children}</div>;
}

export function Eyebrow({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...rest} className={cn("studio-eyebrow block", className)}>
      {children}
    </span>
  );
}

export function SectionTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <h2
      className={cn("studio-display mt-4 text-balance", className)}
      style={{ fontSize: "clamp(2rem, 3.6vw, 3.25rem)" }}
    >
      {children}
    </h2>
  );
}

export function Lede({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={cn("mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-muted-foreground md:text-lg", className)}>
      {children}
    </p>
  );
}
