export interface CursorPaginationInput {
  cursor?: string;
  limit: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
}

export const withCursorPagination = <T extends { id: string }>(
  rows: T[],
  limit: number
): CursorPaginationResult<T> => {
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].id : null;
  return { items, nextCursor };
};
