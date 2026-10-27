import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMe, type Me } from "@/api/me";
import { useAuthState } from "@/auth";
import { TrackingNotice } from "@/components/TrackingNotice";
import { PageLoading } from "@/components/shell/PageLoading";
import { Separator } from "@/components/ui/separator";
import { HOME_PATH } from "@/lib/paths";
import { ProfileForm } from "@/profile/ProfileForm";
import { initialValues } from "@/profile/profile-model";
import { strings } from "@/strings";

const copy = strings.profile;

function ProfileContent({ userId, me }: { readonly userId: string; readonly me: Me }) {
  // Fixed at arrival: the first save completes the cached profile before the
  // page leaves, and the title must not change under the investor meanwhile.
  const [firstVisit] = useState(!me.profileComplete);
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">
        {firstVisit ? copy.firstTitle : copy.editTitle}
      </h1>
      <p className="mt-4 max-w-prose text-foreground/80">{firstVisit ? copy.firstIntro : copy.editIntro}</p>
      <Separator className="my-8" />
      <ProfileForm
        userId={userId}
        initial={initialValues(me)}
        firstVisit={firstVisit}
        onFirstSave={() => navigate(HOME_PATH, { replace: true })}
      />
      <TrackingNotice className="mt-10" />
    </section>
  );
}

function ProfileScreen({ userId }: { readonly userId: string }) {
  // The profile gate (PortalGate) has this answer cached before the page renders.
  const me = useMe(userId);
  if (!me.data) return <PageLoading />;
  return <ProfileContent userId={userId} me={me.data} />;
}

/** /investors/profile (US-005): the first-visit form, and later the profile from the account menu. */
export function Profile() {
  const state = useAuthState();
  // PortalGate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <ProfileScreen userId={state.userId} />;
}
