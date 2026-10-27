import { useMutation } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { downloadInvestorsCsv } from "./investors-csv";
import type { InvestorsQuery } from "./investors-query";

const copy = strings.admin.investors.exportCsv;

/** "Export CSV": the table's search, filters and sort, every page, saved as a file. */
export function CsvExportButton({ query }: { readonly query: InvestorsQuery }) {
  const descriptionId = useId();
  const exporting = useMutation({ mutationFn: () => downloadInvestorsCsv(query) });

  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-describedby={descriptionId}
        disabled={exporting.isPending}
        onClick={() => exporting.mutate()}
      >
        <FileDown />
        {exporting.isPending ? copy.preparing : copy.button}
      </Button>
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      {exporting.isError && (
        <p role="alert" className="text-sm text-destructive">
          {copy.failed}
        </p>
      )}
    </div>
  );
}
