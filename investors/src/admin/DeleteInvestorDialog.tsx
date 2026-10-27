import { useState, type FormEvent } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/strings";

import type { AdminInvestor } from "./investors-api";
import { deleteConfirmed, deleteFailureMessage } from "./investors-model";
import { useDeleteInvestor } from "./use-investors";

const copy = strings.admin.investor.delete;

type Target = Pick<AdminInvestor, "id" | "email">;

interface DeleteInvestorDialogProps {
  readonly userId: string;
  /** null: closed. */
  readonly investor: Target | null;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

function DeleteConfirm({ userId, investor, onDeleted }: Omit<DeleteInvestorDialogProps, "onClose"> & { readonly investor: Target }) {
  const remove = useDeleteInvestor(userId);
  const [typed, setTyped] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const ready = deleteConfirmed(typed, investor.email);

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!ready || remove.isPending) return;
    setFailure(null);
    remove.mutate(investor.id, { onSuccess: onDeleted, onError: (error) => setFailure(deleteFailureMessage(error)) });
  }

  return (
    <AlertDialogContent>
      <form onSubmit={confirm} className="grid gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-2">
              <p>{copy.body}</p>
              <p className="text-foreground">{copy.clerk}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="delete-investor-email" className="text-sm normal-case tracking-normal text-foreground">
            {copy.confirmLabel(investor.email)}
          </Label>
          <Input
            id="delete-investor-email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={remove.isPending}>
            {copy.cancel}
          </AlertDialogCancel>
          <Button type="submit" variant="destructive" disabled={!ready || remove.isPending}>
            {remove.isPending ? copy.deleting : copy.confirm}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}

/** Delete with a typed confirmation: the portal's row, visits and events go; the Clerk account stays. */
export function DeleteInvestorDialog({ userId, investor, onClose, onDeleted }: DeleteInvestorDialogProps) {
  return (
    <AlertDialog open={investor !== null} onOpenChange={(open) => !open && onClose()}>
      {investor && (
        <DeleteConfirm key={investor.id} userId={userId} investor={investor} onDeleted={onDeleted} />
      )}
    </AlertDialog>
  );
}
