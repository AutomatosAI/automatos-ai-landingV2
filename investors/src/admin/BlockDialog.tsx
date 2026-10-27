import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { blockFailureMessage, investorName } from "./investors-model";
import { useSetBlocked } from "./use-investors";

const copy = strings.admin.block;

/** Who is about to be blocked or unblocked: the fields the table row and the detail page both have. */
export interface BlockTarget {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly blocked: boolean;
}

interface BlockDialogProps {
  readonly userId: string;
  /** null: closed. */
  readonly target: BlockTarget | null;
  readonly onClose: () => void;
}

function BlockConfirm({ userId, target, onClose }: BlockDialogProps & { readonly target: BlockTarget }) {
  const setBlocked = useSetBlocked(userId);
  const [failure, setFailure] = useState<string | null>(null);
  const blocking = !target.blocked;
  const who = investorName(target);

  function confirm() {
    setFailure(null);
    setBlocked.mutate(
      { id: target.id, blocked: blocking },
      { onSuccess: onClose, onError: (error) => setFailure(blockFailureMessage(error)) },
    );
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{blocking ? copy.blockTitle(who) : copy.unblockTitle(who)}</AlertDialogTitle>
        <AlertDialogDescription>{blocking ? copy.blockBody : copy.unblockBody}</AlertDialogDescription>
      </AlertDialogHeader>
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={setBlocked.isPending}>{copy.cancel}</AlertDialogCancel>
        {/* A plain button: the dialog stays open until the server has answered. */}
        <Button
          type="button"
          variant={blocking ? "destructive" : "default"}
          disabled={setBlocked.isPending}
          onClick={confirm}
        >
          {setBlocked.isPending ? copy.saving : blocking ? copy.block : copy.unblock}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/** Block or unblock, with confirmation. The server enforces it on the investor's next request (KP3). */
export function BlockDialog({ userId, target, onClose }: BlockDialogProps) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target && <BlockConfirm key={target.id} userId={userId} target={target} onClose={onClose} />}
    </AlertDialog>
  );
}
