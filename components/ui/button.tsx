import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] px-4 py-2 text-[var(--accent-text)] shadow-sm hover:bg-[var(--accent-hover)]",
        ghost:
          "border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
