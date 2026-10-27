import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/profile/FormField";
import { strings } from "@/strings";

import {
  SECTION_LIMITS,
  sectionErrorMessage,
  sectionFieldId,
  type SectionDraft,
  type SectionField,
  type SectionFieldErrors,
} from "./section-editor-model";

const fields = strings.admin.sections.fields;
const COUNT = new Intl.NumberFormat("en-GB");

export interface SectionFieldsBinding {
  readonly draft: SectionDraft;
  readonly errors: SectionFieldErrors;
  readonly change: (change: Partial<SectionDraft>) => void;
}

function errorFor(form: SectionFieldsBinding, field: SectionField): string | undefined {
  const code = form.errors[field];
  return code === undefined ? undefined : sectionErrorMessage(field, code);
}

function TitleRow({ form }: { readonly form: SectionFieldsBinding }) {
  return (
    <FormField id={sectionFieldId("title")} label={fields.title.label} error={errorFor(form, "title")}>
      {(control) => (
        <Input
          {...control}
          autoComplete="off"
          value={form.draft.title}
          onChange={(event) => form.change({ title: event.target.value })}
        />
      )}
    </FormField>
  );
}

function PublishedRow({ form }: { readonly form: SectionFieldsBinding }) {
  const id = sectionFieldId("published");
  return (
    <div className="flex items-start gap-3">
      <Switch
        id={id}
        checked={form.draft.published}
        aria-describedby={`${id}-hint`}
        onCheckedChange={(published) => form.change({ published })}
      />
      <div className="grid gap-1">
        <label htmlFor={id} className="cursor-pointer text-sm leading-6">
          {fields.published.label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {fields.published.hint}
        </p>
      </div>
    </div>
  );
}

function BodyRow({ form }: { readonly form: SectionFieldsBinding }) {
  const id = sectionFieldId("bodyMd");
  const hintId = `${id}-hint`;
  const used = form.draft.bodyMd.length;
  return (
    <FormField id={id} label={fields.body.label} error={errorFor(form, "bodyMd")}>
      {(control) => (
        <>
          <p id={hintId} className="text-sm text-muted-foreground">
            {fields.body.hint}
          </p>
          <Textarea
            {...control}
            aria-describedby={[hintId, control["aria-describedby"]].filter(Boolean).join(" ")}
            rows={18}
            spellCheck
            className="min-h-[18rem] font-mono leading-relaxed md:text-[13px]"
            value={form.draft.bodyMd}
            onChange={(event) => form.change({ bodyMd: event.target.value })}
          />
          <p className={used > SECTION_LIMITS.bodyMd ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {fields.body.count(COUNT.format(used), COUNT.format(SECTION_LIMITS.bodyMd))}
          </p>
        </>
      )}
    </FormField>
  );
}

/** The editor's fields, one column: the title, the published switch, the markdown. */
export function SectionFields({ form }: { readonly form: SectionFieldsBinding }) {
  return (
    <div className="grid content-start gap-6">
      <TitleRow form={form} />
      <PublishedRow form={form} />
      <BodyRow form={form} />
    </div>
  );
}
