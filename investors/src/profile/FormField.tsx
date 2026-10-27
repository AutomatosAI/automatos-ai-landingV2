import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { strings } from "@/strings";

/** What the field's control needs to be tied to its label and its error. */
export interface ControlProps {
  readonly id: string;
  readonly "aria-invalid": true | undefined;
  readonly "aria-describedby": string | undefined;
}

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly optional?: boolean;
  /** The words for the field's error, shown under it. */
  readonly error?: string;
  readonly children: (control: ControlProps) => ReactNode;
}

/** A label, a control and, when there is one, the error under it. */
export function FormField({ id, label, optional = false, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1.5 normal-case tracking-normal">{strings.profile.optional}</span>}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
