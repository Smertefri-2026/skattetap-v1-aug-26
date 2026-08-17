"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";
import { submitSimpleCheck, type SimpleCheckState } from "@/lib/cases/simpleCheckActions";
import { SimpleCheckResultView } from "./SimpleCheckResultView";

const taxTypeOptions: { value: string; label: string }[] = [
  { value: "lonn", label: "Lønn" },
  { value: "naering", label: "Næring" },
  { value: "formue", label: "Formue" },
  { value: "arv_gave", label: "Arv/gave" },
  { value: "annet", label: "Annet" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Analyserer..." : "Analyser saken"}
    </Button>
  );
}

interface SimpleCheckFormProps {
  caseId: string;
  defaults: {
    taxPeriod: string | null;
    taxType: string;
    amountKr: number | null;
    description: string | null;
  };
  initialResult?: SimpleCheckState & { status: "success" };
}

const initialState: SimpleCheckState = { status: "idle" };

export function SimpleCheckForm({ caseId, defaults, initialResult }: SimpleCheckFormProps) {
  const [state, formAction] = useActionState(
    submitSimpleCheck.bind(null, caseId),
    initialResult ?? initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="taxPeriod" className="text-[13px] font-medium text-ink">
              År/periode
            </label>
            <input
              id="taxPeriod"
              name="taxPeriod"
              defaultValue={defaults.taxPeriod ?? ""}
              placeholder="F.eks. 2023"
              className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="taxType" className="text-[13px] font-medium text-ink">
              Skattetype
            </label>
            <select
              id="taxType"
              name="taxType"
              defaultValue={defaults.taxType}
              className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
            >
              {taxTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="amountKr" className="text-[13px] font-medium text-ink">
            Beløp hvis kjent (kr)
          </label>
          <input
            id="amountKr"
            name="amountKr"
            type="number"
            min={0}
            step="1"
            defaultValue={defaults.amountKr ?? ""}
            className="mt-1.5 w-full max-w-[200px] rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="description" className="text-[13px] font-medium text-ink">
            Kort forklaring
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={4000}
            rows={5}
            defaultValue={defaults.description ?? ""}
            placeholder="Fortell kort hva saken gjelder, med egne ord."
            className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
          />
        </div>

        {state.status === "error" && (
          <p className="text-[13px] text-danger-ink">{state.error}</p>
        )}

        <div>
          <SubmitButton />
        </div>
      </form>

      {state.status === "success" && (
        <SimpleCheckResultView result={state.result} caseId={caseId} />
      )}
    </div>
  );
}
