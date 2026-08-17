import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("slår sammen klassenavn og filtrerer bort falske verdier", () => {
    expect(cn("a", false, "b", undefined, null, "c")).toBe("a b c");
  });
});
