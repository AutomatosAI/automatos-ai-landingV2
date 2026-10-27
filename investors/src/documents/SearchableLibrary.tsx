import { Search, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { strings } from "@/strings";

import type { InvestorDocument } from "./documents-api";
import { DocumentGroups } from "./DocumentGroups";
import { filterDocuments, groupByCategory, searchTerms } from "./library-model";

const search = strings.library.search;

interface SearchBoxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly resultsId: string;
}

function SearchBox({ value, onChange, resultsId }: SearchBoxProps) {
  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={search.label}
        aria-controls={resultsId}
        placeholder={search.placeholder}
        className="pl-9 pr-11"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">{search.clear}</span>
        </button>
      )}
    </div>
  );
}

interface SearchableLibraryProps {
  readonly documents: readonly InvestorDocument[];
  readonly onGone: () => void;
}

/** The Documents page: the grouped list under a search box (ported from the reference DataRoom, KP12). */
export function SearchableLibrary({ documents, onGone }: SearchableLibraryProps) {
  const [query, setQuery] = useState("");
  const resultsId = useId();
  const matches = filterDocuments(documents, query);
  const searching = searchTerms(query).length > 0;
  return (
    <div className="space-y-8">
      <SearchBox value={query} onChange={setQuery} resultsId={resultsId} />
      <div id={resultsId}>
        <p aria-live="polite" className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {searching && search.results(matches.length)}
        </p>
        {matches.length === 0 ? (
          <div className="space-y-4 rounded-lg border px-5 py-10 text-center sm:px-6">
            <p className="text-muted-foreground">{search.noMatch(query.trim())}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
              {search.clear}
            </Button>
          </div>
        ) : (
          <DocumentGroups groups={groupByCategory(matches)} onGone={onGone} />
        )}
      </div>
    </div>
  );
}
