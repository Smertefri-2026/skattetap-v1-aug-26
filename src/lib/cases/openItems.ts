import type { SupabaseClient } from "@supabase/supabase-js";
import type { OtherOpenItem } from "@/components/cases/NextActionCard";

export interface SidebarOpenItems {
  singleOpenGapId?: string;
  otherOpenItems: OtherOpenItem[];
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Cheap, single-table lookups purpose-built for the sidebar's "Andre åpne
 * oppgaver" list -- deliberately not the heavier joined getCaseConflicts()/
 * gaps-with-context queries SaksbildeView already runs, so the sidebar
 * doesn't duplicate that work just to show two short labels. Only ever
 * open items: a gap or conflict that's been resolved has no business
 * still showing up as something to do.
 */
export async function getSidebarOpenItems(supabase: SupabaseClient, caseId: string): Promise<SidebarOpenItems> {
  const [{ data: openGaps }, { data: openConflicts }] = await Promise.all([
    supabase
      .from("documentation_gaps")
      .select("id, description")
      .eq("case_id", caseId)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("case_conflicts")
      .select("id, reasoning")
      .eq("case_id", caseId)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  const gaps = openGaps ?? [];
  const singleOpenGapId = gaps.length === 1 ? (gaps[0].id as string) : undefined;

  // The one open gap a single-gap case's main recommendation already
  // deep-links to (see nextActionCta.ts) shouldn't also show up as an
  // "other" item -- that would just be the same thing twice.
  const gapItems: OtherOpenItem[] = gaps
    .filter((g) => g.id !== singleOpenGapId)
    .map((g) => ({
      label: truncate(g.description as string, 60),
      href: `/min-side/saker/${caseId}?steg=saksbilde#hull-${g.id}`,
    }));

  const conflictItems: OtherOpenItem[] = (openConflicts ?? []).map((c) => ({
    label: truncate(c.reasoning as string, 60),
    href: `/min-side/saker/${caseId}?steg=saksbilde#konflikt-${c.id}`,
  }));

  return {
    singleOpenGapId,
    otherOpenItems: [...gapItems, ...conflictItems].slice(0, 2),
  };
}
