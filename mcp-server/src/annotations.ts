export type ToolAccess = "read" | "write" | "destructive";

export interface ToolAnnotationHints {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

// Hints are derived from one declared word, so a contradictory combination cannot be written.
export function toAnnotations(access: ToolAccess, title: string): ToolAnnotationHints {
  return {
    title,
    readOnlyHint: access === "read",
    destructiveHint: access === "destructive",
    idempotentHint: access === "read",
    openWorldHint: true,
  };
}
