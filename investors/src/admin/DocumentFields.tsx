import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/profile/FormField";
import { oneOfOrBlank } from "@/profile/options";
import { strings } from "@/strings";

import {
  DOCUMENT_LIMITS,
  KIND_OPTIONS,
  documentErrorMessage,
  documentFieldId,
  type DocumentField,
  type DocumentFieldErrors,
  type DocumentFormValues,
} from "./document-form";
import { DOCUMENT_KINDS } from "./documents-api";

export type SetDocumentField = <F extends DocumentField>(field: F, value: DocumentFormValues[F]) => void;

export interface DocumentFieldsBinding {
  readonly values: DocumentFormValues;
  readonly errors: DocumentFieldErrors;
  readonly disabled: boolean;
  readonly set: SetDocumentField;
  /** Categories already in use, offered as suggestions. */
  readonly categories: readonly string[];
}

type TextField = keyof typeof DOCUMENT_LIMITS;

const fields = strings.admin.form.fields;
const CATEGORY_LIST_ID = "document-categories";

function errorFor(form: DocumentFieldsBinding, field: DocumentField): string | undefined {
  const code = form.errors[field];
  return code === undefined ? undefined : documentErrorMessage(field, code);
}

interface TextRowProps {
  readonly form: DocumentFieldsBinding;
  readonly field: TextField;
  readonly label: string;
  readonly optional?: boolean;
  readonly placeholder?: string;
  readonly list?: string;
  /** One line under the control, read with it by screen readers. */
  readonly hint?: string;
}

/** The control's aria-describedby: its error and its hint, when it has them. */
function describedBy(...ids: readonly (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

function TextRow({ form, field, label, optional, placeholder, list, hint }: TextRowProps) {
  const hintId = `${documentFieldId(field)}-hint`;
  return (
    <FormField id={documentFieldId(field)} label={label} optional={optional} error={errorFor(form, field)}>
      {(control) => (
        <>
          <Input
            {...control}
            aria-describedby={describedBy(control["aria-describedby"], hint && hintId)}
            autoComplete="off"
            placeholder={placeholder}
            list={list}
            value={form.values[field]}
            disabled={form.disabled}
            onChange={(event) => form.set(field, event.target.value)}
          />
          {hint && (
            <p id={hintId} className="text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </>
      )}
    </FormField>
  );
}

function KindRow({ form }: { readonly form: DocumentFieldsBinding }) {
  return (
    <FormField id={documentFieldId("kind")} label={fields.kind.label} error={errorFor(form, "kind")}>
      {(control) => (
        <NativeSelect
          {...control}
          value={form.values.kind}
          disabled={form.disabled}
          onChange={(event) => form.set("kind", oneOfOrBlank(DOCUMENT_KINDS, event.target.value))}
        >
          {form.values.kind === "" && <option value="">{fields.kind.choose}</option>}
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}

function AlertRow({ form }: { readonly form: DocumentFieldsBinding }) {
  const id = documentFieldId("alertOnFirstOpen");
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={form.values.alertOnFirstOpen}
        disabled={form.disabled}
        onChange={(event) => form.set("alertOnFirstOpen", event.target.checked)}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-5">
        {fields.alertOnFirstOpen.label}
      </label>
    </div>
  );
}

/** The New / Edit document fields, one column. */
export function DocumentFields({ form }: { readonly form: DocumentFieldsBinding }) {
  return (
    <div className="grid gap-5">
      <TextRow form={form} field="title" label={fields.title.label} />
      <TextRow form={form} field="description" label={fields.description.label} optional />
      <TextRow
        form={form}
        field="category"
        label={fields.category.label}
        placeholder={fields.category.placeholder}
        list={CATEGORY_LIST_ID}
        hint={strings.admin.documents.pitchHint}
      />
      <datalist id={CATEGORY_LIST_ID}>
        {form.categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <KindRow form={form} />
      <AlertRow form={form} />
    </div>
  );
}
