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
      style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}
    >
      {children}
    </h2>
  );
}

export function Lede({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={cn("mt-6 max-w-3xl text-[1.1rem] leading-relaxed text-muted-foreground md:text-[1.3rem]", className)}>
      {children}
    </p>
  );
}
