import { useMutation } from "@tanstack/react-query";
import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { fetchInvestorExport } from "./investors-api";
import { exportFileName, saveJson } from "./save-json";

const copy = strings.admin.investor.export;

/** "Export data (JSON)": the profile, visits and every event, for an access request (GDPR). */
export function ExportButton({ investorId }: { readonly investorId: string }) {
  const exporting = useMutation({
    mutationFn: () => fetchInvestorExport(investorId),
    onSuccess: (body) => saveJson(exportFileName(investorId), body),
  });

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" disabled={exporting.isPending} onClick={() => exporting.mutate()}>
        <FileDown />
        {exporting.isPending ? copy.preparing : copy.button}
      </Button>
      {exporting.isError && (
        <p role="alert" className="text-sm text-destructive">
          {copy.failed}
        </p>
      )}
    </div>
  );
}
