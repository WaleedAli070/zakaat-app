export type Citation = { id: string; source: string; ref: string; url: string; quote?: string };

/** keyed `${ruleId}:${option}`; FIXED rules use `FIXED:${option}` */
export const CITATIONS: Record<string, Citation[]> = {};

export function citationIdsFor(ruleId: string, option: string): string[] {
  return (CITATIONS[`${ruleId}:${option}`] ?? []).map((c) => c.id);
}
