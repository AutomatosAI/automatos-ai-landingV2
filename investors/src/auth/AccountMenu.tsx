import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROFILE_PATH } from "@/lib/paths";
import { strings } from "@/strings";

import { useAuthActions, useAuthState } from "./context";

/** The signed-in visitor's menu: their email, the profile form, sign out. Nothing when signed out. */
export function AccountMenu() {
  const state = useAuthState();
  const { signOut } = useAuthActions();
  if (state.status !== "signed_in") return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          {strings.auth.accountMenu}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {state.email && <DropdownMenuLabel>{state.email}</DropdownMenuLabel>}
        {state.email && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link to={PROFILE_PATH}>{strings.auth.profile}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>{strings.auth.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
