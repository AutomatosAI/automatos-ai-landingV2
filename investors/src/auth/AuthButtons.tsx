import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { useAuthActions } from "./context";

/**
 * The primary button's label is long: on a phone it wraps, balanced, at
 * least 44 px tall, rather than clip (PRD-003 US-304).
 */
const WRAPPING = "h-auto min-h-11 whitespace-normal py-2.5 text-center text-balance";

/** "Create an account to read the deck" / Sign in: each opens the provider's form in a modal. */
export function AuthButtons({ disabled = false }: { disabled?: boolean }) {
  const { openSignIn, openSignUp } = useAuthActions();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="button" onClick={openSignUp} disabled={disabled} className={WRAPPING}>
        {strings.auth.createAccount}
      </Button>
      <Button type="button" variant="outline" onClick={openSignIn} disabled={disabled}>
        {strings.auth.signIn}
      </Button>
    </div>
  );
}
