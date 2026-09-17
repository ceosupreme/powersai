import type { PropsWithChildren } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

export function StudioReveal({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

  return (
    <div ref={ref} className={cn("studio-reveal", inView && "studio-reveal-visible", className)}>
      {children}
    </div>
  );
}