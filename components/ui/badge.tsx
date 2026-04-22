import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-500/15 text-sky-100",
        secondary:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
        outline:
          "border-white/10 bg-black/15 text-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
