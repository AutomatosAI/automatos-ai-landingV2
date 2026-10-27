import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { strings } from "@/strings";

import type { LeaveGuard } from "./use-leave-guard";

const copy = strings.admin.sections.leave;

/** "Leave without saving?" for a link followed with unsaved changes; Escape or "Keep editing" stays. */
export function LeaveDialog({ guard }: { readonly guard: LeaveGuard }) {
  return (
    <AlertDialog open={guard.asking} onOpenChange={(open) => !open && guard.stay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.stay}</AlertDialogCancel>
          <AlertDialogAction onClick={guard.leave}>{copy.leave}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
