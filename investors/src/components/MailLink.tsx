import { cn } from "@/lib/utils";

/** A mailto link that shows the address itself. */
export function MailLink({ email, className }: { email: string; className?: string }) {
  return (
    <a href={`mailto:${email}`} className={cn("underline underline-offset-4 hover:text-foreground", className)}>
      {email}
    </a>
  );
}
