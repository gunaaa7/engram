import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-[1.6rem] border border-white/12 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:bg-black/30",
        className,
      )}
      ref={ref}
      suppressHydrationWarning
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
