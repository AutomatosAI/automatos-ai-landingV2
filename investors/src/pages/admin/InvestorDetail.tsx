import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { BlockDialog } from "@/admin/BlockDialog";
import { DeleteInvestorDialog } from "@/admin/DeleteInvestorDialog";
import { DocumentSummaryTable } from "@/admin/DocumentSummaryTable";
import { ExportButton } from "@/admin/ExportButton";
import type { InvestorDetail } from "@/admin/investors-api";
import { investorName } from "@/admin/investors-model";
import { parsePage } from "@/admin/investors-query";
import { InvestorTimeline } from "@/admin/InvestorTimeline";
import { BlockedTag } from "@/admin/InvestorRow";
import { LoadFailed } from "@/admin/LoadFailed";
import { ProfileCard } from "@/admin/ProfileCard";
import { useInvestorDetail } from "@/admin/use-investors";
import { ApiError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_INVESTORS_PATH } from "@/lib/paths";
import { strings } from "@/strings";

const copy = strings.admin.investor;
const actions = strings.admin.investors;

type Dialog = "closed" | "block" | "delete";

function BackLink() {
  return (
    <Link
      to={ADMIN_INVESTORS_PATH}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {copy.back}
    </Link>
  );
}

function DetailLoading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  );
}

function Missing() {
  return (
    <div className="grid gap-3">
      <h1 className="font-serif text-4xl font-normal leading-tight">{copy.missing.title}</h1>
      <p className="max-w-prose text-muted-foreground">{copy.missing.body}</p>
    </div>
  );
}

interface DetailBodyProps {
  readonly userId: string;
  readonly detail: InvestorDetail;
  readonly onDialog: (dialog: Dialog) => void;
}

function DetailBody({ userId, detail, onDialog }: DetailBodyProps) {
  const { investor } = detail;
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get("page"));
  const action = investor.blocked ? actions.unblock : actions.block;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">
            {investorName(investor)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-foreground/80">
            {investor.firm && <span>{investor.firm}</span>}
            {investor.blocked && <BlockedTag />}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button type="button" variant="outline" onClick={() => onDialog("block")}>
            {action}
          </Button>
          <ExportButton investorId={investor.id} />
          <Button type="button" variant="destructive" onClick={() => onDialog("delete")}>
            <Trash2 />
            {copy.delete.button}
          </Button>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard investor={investor} />
        <DocumentSummaryTable documents={detail.documents} />
      </div>
      <InvestorTimeline
        userId={userId}
        investorId={investor.id}
        page={page}
        onPage={(next) => setParams(next === 1 ? {} : { page: String(next) })}
      />
    </div>
  );
}

function DetailScreen({ userId, id }: { readonly userId: string; readonly id: string }) {
  const detail = useInvestorDetail(userId, id);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>("closed");
  const close = () => setDialog("closed");
  const investor = detail.data?.investor ?? null;

  function body() {
    if (detail.isPending) return <DetailLoading />;
    if (detail.isError) {
      if (detail.error instanceof ApiError && detail.error.kind === "not_found") return <Missing />;
      return <LoadFailed error={detail.error} onRetry={() => void detail.refetch()} />;
    }
    return <DetailBody userId={userId} detail={detail.data} onDialog={setDialog} />;
  }

  return (
    <section className="grid gap-6">
      <BackLink />
      {body()}
      <BlockDialog userId={userId} target={dialog === "block" ? investor : null} onClose={close} />
      <DeleteInvestorDialog
        userId={userId}
        investor={dialog === "delete" ? investor : null}
        onClose={close}
        onDeleted={() => navigate(ADMIN_INVESTORS_PATH, { replace: true })}
      />
    </section>
  );
}

/** /investors/admin/investors/:id (US-013): one investor's profile, documents and timeline; export and delete. */
export function AdminInvestorDetail() {
  const state = useAuthState();
  const { id } = useParams();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in" || !id) return null;
  return <DetailScreen key={id} userId={state.userId} id={id} />;
}
