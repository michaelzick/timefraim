import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-[rgba(8,12,24,0.82)] p-5 shadow-[0_24px_80px_rgba(5,8,18,0.55)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
