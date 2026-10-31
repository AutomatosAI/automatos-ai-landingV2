import { cn } from "@/lib/utils";

/**
 * The ship of the site's favicon.svg (the family kit's automatos-ai ship):
 * its path only, without the file's metadata block, gradient or rounded
 * square. FamilyTile draws it white on the kit's tile.
 */
export const SHIP_PATH =
  "M160.99 204.507L69.0508 205.138L62.0811 188.532L194.972 177.929L160.99 204.507ZM115.631 174.64C95.9516 173.895 84.3043 174.639 61.0293 176.463C74.5047 155.234 103.609 106.893 112.224 83.3545L115.631 174.64ZM127.081 49.7773C154.399 95.7732 187.433 152.461 193.68 165.008C170.069 166.884 155.669 168.286 131.624 171.49L127.081 49.7773Z";

/** Our ship mark in the colour around it. Decorative: the words beside it name the company. */
export function ShipMark({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={SHIP_PATH} fill="currentColor" />
    </svg>
  );
}
