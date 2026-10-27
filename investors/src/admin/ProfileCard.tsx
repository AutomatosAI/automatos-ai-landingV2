import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/strings";

import type { AdminInvestor } from "./investors-api";
import { profileFacts, type ProfileFact } from "./investors-model";

const copy = strings.admin.investor.profile;

function FactValue({ fact }: { readonly fact: ProfileFact }) {
  if (!fact.href) return <>{fact.value}</>;
  return (
    <a href={fact.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
      {fact.value}
    </a>
  );
}

/** Everything the investor told us, their marketing choice, and when they signed up and were last seen. */
export function ProfileCard({ investor }: { readonly investor: AdminInvestor }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          {profileFacts(investor).map((fact) => (
            <div key={fact.label} className="grid gap-1 sm:contents">
              <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:pt-0.5">
                {fact.label}
              </dt>
              <dd className="break-words">
                <FactValue fact={fact} />
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
