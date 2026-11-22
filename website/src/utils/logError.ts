const codeOf = (value: unknown): string | undefined =>
  typeof value === "object" && value !== null && "code" in value && typeof value.code === "string"
    ? value.code
    : undefined;

/**
 * Logs a failed route without its content: drizzle puts every query value (e-mail, text, name) into the error
 * message, so only the route, the error name and the error / postgres `cause` codes are written.
 */
export const logRouteError = (route: string, error: unknown): void => {
  const name = error instanceof Error ? error.name : typeof error;
  const cause = error instanceof Error ? codeOf(error.cause) : undefined;
  console.error(
    `[${route}] failed: ${name}`,
    ...[codeOf(error) && `code=${codeOf(error)}`, cause && `cause.code=${cause}`].filter(Boolean),
  );
};
