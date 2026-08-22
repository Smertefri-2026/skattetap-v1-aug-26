"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system";

export function DocumentUploadForm({
  caseId,
  disabledReason,
}: {
  caseId: string;
  /** Set when the case has used its included capacity -- the button stays
   * disabled with this text instead of allowing a click that the server
   * would reject anyway. Informational only; the real gate is server-side. */
  disabledReason?: string;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/cases/${caseId}/documents`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Opplasting feilet. Prøv igjen.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={status === "uploading"}
        className="hidden"
        id="document-upload-input"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={status === "uploading" || !!disabledReason}
        onClick={() => inputRef.current?.click()}
      >
        {status === "uploading" ? "Laster opp og analyserer..." : "Last opp dokument (PDF)"}
      </Button>
      {disabledReason && status !== "uploading" && (
        <p className="text-[12.5px] text-ink-faint">{disabledReason}</p>
      )}
      {error && <p className="text-[13px] text-danger-ink">{error}</p>}
    </div>
  );
}
