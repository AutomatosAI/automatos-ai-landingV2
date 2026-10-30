import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SectionSlug } from "@/sections/sections-model";
import { strings } from "@/strings";

import { LeaveDialog } from "./LeaveDialog";
import { SectionFields } from "./SectionFields";
import { SectionPreview } from "./SectionPreview";
import {
  firstInvalidField,
  isDirty,
  saveFailure,
  savedAs,
  sectionFieldId,
  startEditing,
  toSaveBody,
  validateDraft,
  withChange,
  type EditorState,
  type SectionDraft,
  type SectionFieldErrors,
} from "./section-editor-model";
import type { AdminSection } from "./sections-api";
import { useLeaveGuard } from "./use-leave-guard";
import { useSaveSection } from "./use-sections";

const copy = strings.admin.sections;

interface SectionEditorProps {
  readonly userId: string;
  readonly slug: SectionSlug;
  /** The section as the server last gave it; the editor keeps its own copy from then on. */
  readonly section: AdminSection;
}

function useEditorState(section: AdminSection) {
  const [state, setState] = useState<EditorState>(() => startEditing(section));
  const [errors, setErrors] = useState<SectionFieldErrors>({});
  const change = useCallback((next: Partial<SectionDraft>) => {
    setState((current) => withChange(current, next));
    // A field's error goes once the admin touches that field.
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !(field in next))));
  }, []);
  return { state, setState, errors, setErrors, change };
}

function failed(title: string, message: string, fields: SectionFieldErrors, show: (errors: SectionFieldErrors) => void) {
  show(fields);
  toast.error(copy.saveFailed(title), { description: message });
  const first = firstInvalidField(fields);
  if (first !== null) document.getElementById(sectionFieldId(first))?.focus();
}

/**
 * One section's editor (US-016): title, published switch and markdown on
 * one side, the live preview on the other (stacked on a phone). Save sends
 * all three; a toast says how it went. Unsaved changes hold any link that
 * would leave the page until the admin confirms.
 */
export function SectionEditor({ userId, slug, section }: SectionEditorProps) {
  const { state, setState, errors, setErrors, change } = useEditorState(section);
  const save = useSaveSection(userId);
  const dirty = isDirty(state);
  const guard = useLeaveGuard(dirty);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDraft(state.draft);
    if (Object.keys(found).length > 0) return failed(state.saved.title, copy.failures.fields, found, setErrors);
    const body = toSaveBody(state.draft);
    save.mutate(
      { slug, body },
      {
        onSuccess: (answer) => {
          setState((current) => savedAs(current, body, answer));
          toast.success(copy.saved(answer.title, answer.published));
        },
        onError: (error) => {
          const failure = saveFailure(error);
          failed(state.saved.title, failure.message, failure.fields, setErrors);
        },
      },
    );
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <SectionFields slug={slug} form={{ draft: state.draft, errors, change }} />
        <SectionPreview slug={slug} draft={state.draft} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? copy.saving : copy.save}
        </Button>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {dirty ? copy.dirty : copy.clean}
        </p>
      </div>
      <LeaveDialog guard={guard} />
    </form>
  );
}
