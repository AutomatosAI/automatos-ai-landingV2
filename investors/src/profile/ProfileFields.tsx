import type { HTMLInputAutoCompleteAttribute } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { strings } from "@/strings";

import { FormField } from "./FormField";
import {
  CHEQUE_SIZES,
  CHEQUE_SIZE_OPTIONS,
  INVESTOR_TYPES,
  INVESTOR_TYPE_OPTIONS,
  SOURCES,
  SOURCE_OPTIONS,
  oneOfOrBlank,
  type Option,
} from "./options";
import { errorMessage, fieldId, type FieldErrors, type ProfileField, type ProfileValues } from "./profile-model";

export type SetField = <F extends ProfileField>(field: F, value: ProfileValues[F]) => void;

export interface FieldsBinding {
  readonly values: ProfileValues;
  readonly errors: FieldErrors;
  readonly disabled: boolean;
  readonly set: SetField;
}

type TextField = "name" | "firm" | "title" | "linkedinUrl" | "country";
type ChoiceField = "investorType" | "chequeSize" | "source";

const fields = strings.profile.fields;

function errorFor(form: FieldsBinding, field: ProfileField): string | undefined {
  const code = form.errors[field];
  return code === undefined ? undefined : errorMessage(field, code);
}

interface TextRowProps {
  readonly form: FieldsBinding;
  readonly field: TextField;
  readonly label: string;
  readonly optional?: boolean;
  readonly placeholder?: string;
  readonly autoComplete: HTMLInputAutoCompleteAttribute;
  readonly type?: "text" | "url";
}

function TextRow({ form, field, label, optional, placeholder, autoComplete, type = "text" }: TextRowProps) {
  return (
    <FormField id={fieldId(field)} label={label} optional={optional} error={errorFor(form, field)}>
      {(control) => (
        <Input
          {...control}
          type={type}
          inputMode={type === "url" ? "url" : undefined}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={form.values[field]}
          disabled={form.disabled}
          onChange={(event) => form.set(field, event.target.value)}
        />
      )}
    </FormField>
  );
}

interface ChoiceRowProps {
  readonly form: FieldsBinding;
  readonly field: ChoiceField;
  readonly label: string;
  readonly optional?: boolean;
  /** The blank first entry: 'Choose one', or for an optional list what blank means. */
  readonly blank: string;
  readonly options: readonly Option<string>[];
  readonly onSelect: (value: string) => void;
}

function ChoiceRow({ form, field, label, optional, blank, options, onSelect }: ChoiceRowProps) {
  return (
    <FormField id={fieldId(field)} label={label} optional={optional} error={errorFor(form, field)}>
      {(control) => (
        <NativeSelect
          {...control}
          value={form.values[field]}
          disabled={form.disabled}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">{blank}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}

function OptInRow({ form }: { readonly form: FieldsBinding }) {
  const id = fieldId("marketingOptIn");
  return (
    <div className="flex items-start gap-3 sm:col-span-2">
      <Checkbox
        id={id}
        checked={form.values.marketingOptIn}
        disabled={form.disabled}
        onChange={(event) => form.set("marketingOptIn", event.target.checked)}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-5">
        {fields.marketingOptIn.label}
      </label>
    </div>
  );
}

/** The profile form's fields (US-005): one column on a phone, two from sm up. */
export function ProfileFields({ form }: { readonly form: FieldsBinding }) {
  const { set } = form;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TextRow form={form} field="name" label={fields.name.label} autoComplete="name" />
      <TextRow form={form} field="firm" label={fields.firm.label} placeholder={fields.firm.placeholder} autoComplete="organization" />
      <TextRow form={form} field="title" label={fields.title.label} optional autoComplete="organization-title" />
      <ChoiceRow
        form={form}
        field="investorType"
        label={fields.investorType.label}
        blank={fields.investorType.choose}
        options={INVESTOR_TYPE_OPTIONS}
        onSelect={(value) => set("investorType", oneOfOrBlank(INVESTOR_TYPES, value))}
      />
      <ChoiceRow
        form={form}
        field="chequeSize"
        label={fields.chequeSize.label}
        optional
        blank={fields.chequeSize.choose}
        options={CHEQUE_SIZE_OPTIONS}
        onSelect={(value) => set("chequeSize", oneOfOrBlank(CHEQUE_SIZES, value))}
      />
      <TextRow
        form={form}
        field="linkedinUrl"
        label={fields.linkedinUrl.label}
        optional
        type="url"
        placeholder={fields.linkedinUrl.placeholder}
        autoComplete="url"
      />
      <TextRow form={form} field="country" label={fields.country.label} optional autoComplete="country-name" />
      <ChoiceRow
        form={form}
        field="source"
        label={fields.source.label}
        blank={fields.source.choose}
        options={SOURCE_OPTIONS}
        onSelect={(value) => set("source", oneOfOrBlank(SOURCES, value))}
      />
      <OptInRow form={form} />
    </div>
  );
}
