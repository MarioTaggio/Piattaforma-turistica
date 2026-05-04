export const DEFAULT_PAGE_SIZE = 10;

export type PageQuery = {
  page: number;
  pageSize: number;
  offset: number;
};

export function parsePage(
  searchParams: { [k: string]: string | string[] | undefined },
  pageSize = DEFAULT_PAGE_SIZE,
): PageQuery {
  const raw = searchParams?.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Math.max(1, parseInt(value ?? "1", 10) || 1);
  return { page: n, pageSize, offset: (n - 1) * pageSize };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
