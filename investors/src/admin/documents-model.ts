import type { AdminDocument } from "./documents-api";

/**
 * The admin's document list as pure functions: the server's order, cache
 * updates after a create, edit or delete, and the PATCHes an up/down move
 * needs. Every function returns a new list.
 */

type Sortable = Pick<AdminDocument, "id" | "sortOrder" | "createdAt">;

/** The server's order (admin-documents.js LIST_SQL): sort_order, created_at, id. */
export function compareDocuments(a: Sortable, b: Sortable): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const created = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (created !== 0 && !Number.isNaN(created)) return created;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortDocuments<T extends Sortable>(documents: readonly T[]): readonly T[] {
  return [...documents].sort(compareDocuments);
}

/** The list with this document replaced (or added), in order. */
export function upsertDocument(documents: readonly AdminDocument[], document: AdminDocument): readonly AdminDocument[] {
  const others = documents.filter((item) => item.id !== document.id);
  return sortDocuments([...others, document]);
}

export function removeDocument(documents: readonly AdminDocument[], id: string): readonly AdminDocument[] {
  return documents.filter((item) => item.id !== id);
}

export type MoveDirection = "up" | "down";

export interface SortChange {
  readonly id: string;
  readonly sortOrder: number;
}

/**
 * The PATCHes that move one document a place up or down. Neighbours with
 * different sort orders swap them (two PATCHes); neighbours that share one
 * (equal orders can only be told apart by date) get the whole list numbered
 * 0..n-1 in its new order, once. Empty when the move is not possible.
 */
export function reorderPlan(documents: readonly Sortable[], id: string, direction: MoveDirection): readonly SortChange[] {
  const ordered = sortDocuments(documents);
  const from = ordered.findIndex((item) => item.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  const moving = ordered[from];
  const neighbour = ordered[to];
  if (from < 0 || !moving || !neighbour) return [];
  if (moving.sortOrder !== neighbour.sortOrder) {
    return [
      { id: moving.id, sortOrder: neighbour.sortOrder },
      { id: neighbour.id, sortOrder: moving.sortOrder },
    ];
  }
  const moved = ordered.map((item, index) => (index === from ? neighbour : index === to ? moving : item));
  return moved.flatMap((item, index) => (item.sortOrder === index ? [] : [{ id: item.id, sortOrder: index }]));
}

/** The categories already in use, for the form's suggestions. */
export function categoriesOf(documents: readonly Pick<AdminDocument, "category">[]): readonly string[] {
  return [...new Set(documents.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
}
