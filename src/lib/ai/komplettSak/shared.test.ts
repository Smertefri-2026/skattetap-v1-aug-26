import { describe, expect, it } from "vitest";
import { formatIndexedClaims, indexClaims, isValidClaimIndex } from "./shared";

describe("indexClaims", () => {
  it("gir hvert faktum et 1-basert nummer i rekkefølge", () => {
    const claims = indexClaims([
      { statement: "Første", origin: "user", status: "undocumented" },
      { statement: "Andre", origin: "ai_suggested", status: "documented" },
    ]);
    expect(claims.map((c) => c.index)).toEqual([1, 2]);
  });
});

describe("isValidClaimIndex", () => {
  it("godtar kun indekser innenfor listens grenser", () => {
    const claims = indexClaims([{ statement: "Ett faktum", origin: "user", status: "undocumented" }]);
    expect(isValidClaimIndex(claims, 1)).toBe(true);
    expect(isValidClaimIndex(claims, 0)).toBe(false);
    expect(isValidClaimIndex(claims, 2)).toBe(false);
  });
});

describe("formatIndexedClaims", () => {
  it("viser en lesbar plassholder når det ikke finnes fakta", () => {
    expect(formatIndexedClaims([])).toContain("ingen fakta");
  });
});
