import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105",
        secondary:
          "border border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--heading)] hover:border-[var(--panel-border-strong)] hover:bg-[var(--panel-hover)]",
        ghost: "text-[var(--muted-strong)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]",
        destructive: "text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-strong)]",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
