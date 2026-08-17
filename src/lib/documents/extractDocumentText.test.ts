import { describe, expect, it } from "vitest";
import { extractDocumentText } from "./extractDocumentText";

describe("extractDocumentText", () => {
  it("avviser filtyper som ikke er PDF uten å prøve å tolke bytes", async () => {
    const result = await extractDocumentText({
      bytes: new TextEncoder().encode("ikke en pdf").buffer,
      mimeType: "text/plain",
      fileName: "notat.txt",
    });

    expect(result.status).toBe("unsupported");
    expect(result.text).toBeNull();
  });
});
