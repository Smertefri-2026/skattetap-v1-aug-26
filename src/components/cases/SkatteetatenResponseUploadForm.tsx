"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system";

export function SkatteetatenResponseUploadForm({ caseId }: { caseId: string }) {
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

    const res = await fetch(`/api/cases/${caseId}/skatteendring/response`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const body = await res.json();
      setStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
      if (!body.interpreted && body.rejectionReason) {
        setError(body.rejectionReason);
      }
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
        id="skatteetaten-response-upload"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={status === "uploading"}
        onClick={() => inputRef.current?.click()}
      >
        {status === "uploading" ? "Laster opp og tolker..." : "Last opp svar fra Skatteetaten (PDF)"}
      </Button>
      {error && <p className="text-[13px] text-danger-ink">{error}</p>}
    </div>
  );
}
