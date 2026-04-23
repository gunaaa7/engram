import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-[1.45rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text)] outline-none shadow-sm transition placeholder:text-[var(--muted)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)]",
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
