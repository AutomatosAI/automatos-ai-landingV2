import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { strings } from "@/strings";

import type { VersionOption } from "./document-stats-model";

const copy = strings.admin.stats.version;

interface VersionPickerProps {
  readonly options: readonly VersionOption[];
  readonly value: number;
  readonly onChange: (version: number) => void;
}

/** Which version of the file the numbers cover; the current one first. A native select: phones open their own picker. */
export function VersionPicker({ options, value, onChange }: VersionPickerProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="stats-version">{copy.label}</Label>
      <NativeSelect
        id="stats-version"
        className="sm:w-56"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option.version} value={String(option.version)}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
