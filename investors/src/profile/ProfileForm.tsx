import { useCallback, useState, type FormEvent } from "react";

import { useSaveMe } from "@/api/me";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { ProfileFields, type SetField } from "./ProfileFields";
import {
  clearFieldError,
  fieldId,
  firstInvalidField,
  saveFailure,
  toProfileBody,
  validateProfile,
  type FieldErrors,
  type ProfileValues,
} from "./profile-model";

interface Notice {
  readonly kind: "error" | "saved";
  readonly text: string;
}

interface ProfileFormProps {
  readonly userId: string;
  readonly initial: ProfileValues;
  /** First visit: the button says 'Save and continue' and a save calls onFirstSave. */
  readonly firstVisit: boolean;
  readonly onFirstSave: () => void;
}

function NoticeLine({ notice }: { readonly notice: Notice | null }) {
  if (notice === null) return null;
  const error = notice.kind === "error";
  return (
    <p role={error ? "alert" : "status"} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
      {notice.text}
    </p>
  );
}

/** The profile form: checks locally, then PUT /me; the server's field errors land under their fields. */
export function ProfileForm({ userId, initial, firstVisit, onFirstSave }: ProfileFormProps) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const save = useSaveMe(userId);
  const copy = strings.profile;

  const set = useCallback<SetField>((field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => clearFieldError(previous, field));
    setNotice(null);
  }, []);

  function showErrors(fields: FieldErrors, text: string) {
    setErrors(fields);
    setNotice({ kind: "error", text });
    const first = firstInvalidField(fields);
    if (first !== null) document.getElementById(fieldId(first))?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProfile(values);
    if (Object.keys(found).length > 0) return showErrors(found, copy.checkFields);
    setNotice(null);
    save.mutate(toProfileBody(values), {
      onSuccess: () => (firstVisit ? onFirstSave() : setNotice({ kind: "saved", text: copy.saved })),
      onError: (error) => {
        const failure = saveFailure(error);
        showErrors(failure.fields, failure.message);
      },
    });
  }

  const label = save.isPending ? copy.saving : firstVisit ? copy.saveFirst : copy.save;
  return (
    <form noValidate onSubmit={submit} className="grid gap-8">
      <ProfileFields form={{ values, errors, disabled: save.isPending, set }} />
      <div className="grid gap-3">
        <NoticeLine notice={notice} />
        <div>
          <Button type="submit" disabled={save.isPending}>
            {label}
          </Button>
        </div>
      </div>
    </form>
  );
}
