import type { DocumentGroup } from "./library-model";
import { DocumentCard } from "./DocumentCard";

interface DocumentGroupsProps {
  readonly groups: readonly DocumentGroup[];
  readonly onGone: () => void;
}

/** The documents under their category headings, two cards a row from tablets up. */
export function DocumentGroups({ groups, onGone }: DocumentGroupsProps) {
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{group.category}</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {group.documents.map((document) => (
              <li key={document.id}>
                <DocumentCard document={document} onGone={onGone} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
