export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unexpected error";
}

/**
 * Extracts numbered/bulleted list items from AI response content.
 * Used to render interactive clarification questionnaires in the chat UI.
 */
export function extractQuestionnaireItems(content?: string): string[] {
  if (!content) return [];

  const listItems: string[] = [];
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const cleaned = line.replace(/^(?:\d+[\)\.\-:]|[-*•])\s*/, "").trim();
    if (cleaned && cleaned !== line) {
      listItems.push(cleaned.replace(/[.;]+$/, ""));
    }
  }

  if (listItems.length > 0) {
    return Array.from(new Set(listItems)).slice(0, 5);
  }

  const questionLines = lines
    .filter(line => line.includes("?"))
    .map(line => line.replace(/[.;]+$/, ""));

  return Array.from(new Set(questionLines)).slice(0, 5);
}