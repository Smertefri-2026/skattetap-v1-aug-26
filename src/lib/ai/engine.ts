import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { logAiCall } from "./aiCallLog";
import { callAiChatJson } from "./openai";

/**
 * Shared shape for every structured AI call in the system -- the intended
 * foundation for a future Remøy AI OS engine registry, not a
 * Skattetap-specific helper. Nothing in this file references tax, cases,
 * or any other product-specific concept.
 *
 * Encodes three lessons already paid for the hard way in this codebase:
 * every array/enum/nullable field in `schema` should carry a `.catch()`
 * fallback (a real production bug came from a field that could throw
 * instead of degrading); prompts built from user- or document-supplied
 * text must go through `wrapUntrustedContent` before being interpolated
 * into `buildSystemPrompt`/`buildUserPrompt`; and every call is logged to
 * `ai_call_log`, structurally, so "which model produced this, and when"
 * is never unanswerable.
 */
export interface AiEngineDefinition<TInput, TOutput> {
  /** Stable identifier, e.g. "saksbehandler-chat". Used as the log key --
   * do not reuse across genuinely different engines. */
  name: string;
  model?: string;
  temperature?: number;
  buildSystemPrompt: (input: TInput) => string;
  buildUserPrompt: (input: TInput) => string;
  /** Prior conversation turns, for chat-style engines. Omit for
   * single-shot engines. */
  buildHistory?: (input: TInput) => { role: "user" | "assistant"; content: string }[];
  /** The raw-JSON shape may legitimately differ from TOutput (e.g. a
   * snake_case wire format transformed to camelCase), so the schema's
   * input type is intentionally left unconstrained here. */
  schema: z.ZodType<TOutput, z.ZodTypeDef, unknown>;
}

export interface AiEngineCallContext {
  supabase: SupabaseClient;
  caseId?: string;
  userId?: string;
}

export type AiEngine<TInput, TOutput> = (
  input: TInput,
  context: AiEngineCallContext
) => Promise<TOutput>;

export function defineAiEngine<TInput, TOutput>(
  definition: AiEngineDefinition<TInput, TOutput>
): AiEngine<TInput, TOutput> {
  const model = definition.model ?? "gpt-4.1-mini";

  return async function runEngine(input, { supabase, caseId, userId }) {
    const startedAt = Date.now();

    try {
      const result = await callAiChatJson({
        systemPrompt: definition.buildSystemPrompt(input),
        userPrompt: definition.buildUserPrompt(input),
        history: definition.buildHistory?.(input),
        model,
        temperature: definition.temperature,
        validate: (raw) => definition.schema.parse(raw),
      });

      await logAiCall(supabase, {
        engine: definition.name,
        model,
        caseId,
        userId,
        durationMs: Date.now() - startedAt,
        status: "success",
      });

      return result;
    } catch (error) {
      await logAiCall(supabase, {
        engine: definition.name,
        model,
        caseId,
        userId,
        durationMs: Date.now() - startedAt,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}
