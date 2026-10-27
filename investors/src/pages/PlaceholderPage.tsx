import { Separator } from "@/components/ui/separator";
import { strings } from "@/strings";

/** Stands in for the portal's pages until they land. */
export function PlaceholderPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">
        {strings.placeholder.title}
      </h1>
      <Separator className="my-6" />
      <p className="max-w-prose text-muted-foreground">{strings.placeholder.body}</p>
    </section>
  );
}
