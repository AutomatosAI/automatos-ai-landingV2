import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { INVESTOR_TYPE_OPTIONS, INVESTOR_TYPES, oneOfOrBlank, SOURCE_OPTIONS, SOURCES } from "@/profile/options";
import { strings } from "@/strings";

import { hasFilters, SEARCH_MAX_LENGTH, type InvestorsQuery } from "./investors-query";
import { useDebouncedSearch } from "./use-debounced-search";

const copy = strings.admin.investors;

type FilterChange = Partial<Pick<InvestorsQuery, "q" | "type" | "source">>;

interface InvestorFiltersProps {
  readonly query: InvestorsQuery;
  readonly onChange: (change: FilterChange) => void;
  readonly onClear: () => void;
}

/** Search (name, email, firm; sent 300 ms after the typing stops) and the type and source filters. */
export function InvestorFilters({ query, onChange, onClear }: InvestorFiltersProps) {
  const [text, setText] = useDebouncedSearch(query.q, (q) => onChange({ q }));

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="investor-search">{copy.search.label}</Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="investor-search"
            type="search"
            className="pl-9"
            placeholder={copy.search.placeholder}
            maxLength={SEARCH_MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="investor-type">{copy.filters.type}</Label>
        <NativeSelect
          id="investor-type"
          value={query.type ?? ""}
          onChange={(event) => onChange({ type: oneOfOrBlank(INVESTOR_TYPES, event.target.value) || null })}
        >
          <option value="">{copy.filters.allTypes}</option>
          {INVESTOR_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="investor-source">{copy.filters.source}</Label>
        <NativeSelect
          id="investor-source"
          value={query.source ?? ""}
          onChange={(event) => onChange({ source: oneOfOrBlank(SOURCES, event.target.value) || null })}
        >
          <option value="">{copy.filters.allSources}</option>
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {hasFilters(query) && (
        <Button type="button" variant="link" size="sm" className="justify-self-start px-0 sm:col-span-3" onClick={onClear}>
          <X />
          {copy.filters.clear}
        </Button>
      )}
    </div>
  );
}
