import * as React from "react";

import { cn } from "@/lib/utils";

// A native <select>, styled like Input: phones open their own picker, which
// beats a custom listbox at 390 px. text-base under md keeps iOS from zooming.
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
