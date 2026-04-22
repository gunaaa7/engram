import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-12 w-full rounded-[1.4rem] border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:bg-black/30",
          className,
        )}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
