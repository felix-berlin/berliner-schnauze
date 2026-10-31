export const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

/** Payload's NotFound (status 404) means "no such doc"; anything else (DB down ...) must surface. */
export const orNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((error: unknown) => {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  });

/**
 * Postgres' unique violation on (comment, visitor), as Payload throws it: a ValidationError whose
 * first error path is the index columns (pinned by payload/tests/comments.test.ts). Hook errors don't match.
 */
export const isUniqueViolation = (error: unknown) => {
  const e = error as { data?: { errors?: { path?: string }[] }; name?: string };
  return e?.name === "ValidationError" && e.data?.errors?.[0]?.path === "comment_id, visitor";
};
