import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { listFailureMessage } from "./messages";

/** An admin screen whose data could not be read: the plain reason and a retry. */
export function LoadFailed({ error, onRetry }: { readonly error: unknown; readonly onRetry: () => void }) {
  return (
    <div className="grid justify-items-start gap-4">
      <p role="alert" className="max-w-prose text-muted-foreground">
        {listFailureMessage(error)}
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {strings.status.error.retry}
      </Button>
    </div>
  );
}
