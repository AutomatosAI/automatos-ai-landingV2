import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { useAuthActions } from "./context";

/** "Create an account to read the deck" / Sign in: each opens the provider's form in a modal. */
export function AuthButtons({ disabled = false }: { disabled?: boolean }) {
  const { openSignIn, openSignUp } = useAuthActions();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="button" onClick={openSignUp} disabled={disabled}>
        {strings.auth.createAccount}
      </Button>
      <Button type="button" variant="outline" onClick={openSignIn} disabled={disabled}>
        {strings.auth.signIn}
      </Button>
    </div>
  );
}
