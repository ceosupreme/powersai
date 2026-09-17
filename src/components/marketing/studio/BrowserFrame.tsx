import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrowserFrame({
  children,
  className,
  imageClassName,
}: {
  children: ReactNode;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn("studio-browser-frame", className)}>
      <div className="studio-browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
      <div className={cn("studio-browser-viewport", imageClassName)}>{children}</div>
    </div>
  );
}