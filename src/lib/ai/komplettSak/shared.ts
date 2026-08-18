export interface IndexedClaim {
  index: number;
  statement: string;
  origin: string;
  status: string;
}

/** Claims are referenced by a plain 1-based index in every Komplett sak
 * engine prompt, never by UUID -- the model can't hallucinate a valid
 * index the way it could hallucinate an id, and indices are validated
 * against array bounds in code before being resolved back to real claims. */
export function indexClaims(
  claims: { statement: string; origin: string; status: string }[]
): IndexedClaim[] {
  return claims.map((c, i) => ({ index: i + 1, ...c }));
}

export function formatIndexedClaims(claims: IndexedClaim[]): string {
  if (claims.length === 0) return "(ingen fakta/påstander registrert ennå)";
  return claims.map((c) => `[${c.index}] (${c.origin}, ${c.status}) ${c.statement}`).join("\n");
}

export function isValidClaimIndex(claims: IndexedClaim[], index: number): boolean {
  return index >= 1 && index <= claims.length;
}
