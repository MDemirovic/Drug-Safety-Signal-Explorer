import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-12 w-full rounded-full border border-[var(--line)] bg-white/90 px-5 text-[var(--ink)] shadow-sm outline-none transition placeholder:text-[var(--muted-light)] focus:border-[var(--signal)] focus:ring-4 focus:ring-[var(--signal-pale)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
