"use client";

import { useSearchParams } from "next/navigation";

/**
 * Reads a record's uuid from the query string (`?id=…`).
 *
 * Detail screens address records by query param rather than by a dynamic path segment.
 * With `output: "export"`, Next pre-renders only the params `generateStaticParams()` can
 * enumerate at build time — and a ticket or customer uuid does not exist until someone
 * creates the record. A single static page that reads the id at runtime serves every
 * record, and needs no host rewrite rules to do it.
 *
 * Returns "" before hydration or when the param is absent; callers treat that as
 * "nothing selected" and render their not-found state.
 */
export function useRecordId(param = "id"): string {
  return useSearchParams().get(param) ?? "";
}
