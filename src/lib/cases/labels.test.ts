import { describe, expect, it } from "vitest";
import { stageLabels, stageOrder, statusLabels, statusTones } from "./labels";

describe("case labels", () => {
  it("har en etikett for hvert steg i stageOrder", () => {
    for (const stage of stageOrder) {
      expect(stageLabels[stage]).toBeTruthy();
    }
  });

  it("har samme nøkler for statusLabels og statusTones", () => {
    expect(Object.keys(statusLabels).sort()).toEqual(
      Object.keys(statusTones).sort()
    );
  });
});
