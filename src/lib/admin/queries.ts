import { createAdminClient } from "@/lib/supabase/admin";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import { getCaseConflicts } from "@/lib/cases/conflicts";
import { parseRefundRequestMessage, REFUND_REQUEST_MARKER } from "@/lib/purchases/refundRequests";

/**
 * All admin/CRM reads go through the service-role client -- requireAdmin()
 * is the one security boundary (checked with the caller's own session
 * before any of these run), so there's no need to replicate per-table RLS
 * bypass policies just to let one already-verified admin read across every
 * user's data. Every function here is read-only.
 */

// auth.users isn't exposed through PostgREST, so admin pages that need an
// email next to a case/escalation/purchase go through this. A single
// listUsers() page (up to 1000) is enough at current volume; this is the
// one place to add pagination if the user base outgrows that.
async function getUserEmailMap(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return new Map((data?.users ?? []).map((u) => [u.id, u.email ?? "(ingen e-post)"]));
}

export interface AdminOverview {
  userCount: number;
  caseCountByStage: Record<string, number>;
  totalRevenueKr: number;
  openEscalationCount: number;
  aiCallErrorCount24h: number;
  aiCallCount24h: number;
  refundRequestCount: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: users },
    { data: cases },
    { data: purchases },
    { count: openEscalations },
    { data: aiCalls },
    { count: refundRequestCount },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("cases").select("stage"),
    supabase.from("purchases").select("amount_kr").eq("status", "completed"),
    supabase.from("support_escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("ai_call_log").select("status").gte("created_at", since24h),
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .like("message", `${REFUND_REQUEST_MARKER}%`),
  ]);

  const caseCountByStage: Record<string, number> = {};
  for (const c of cases ?? []) {
    caseCountByStage[c.stage] = (caseCountByStage[c.stage] ?? 0) + 1;
  }

  return {
    userCount: users?.users.length ?? 0,
    caseCountByStage,
    totalRevenueKr: (purchases ?? []).reduce((sum, p) => sum + (p.amount_kr as number), 0),
    openEscalationCount: openEscalations ?? 0,
    aiCallCount24h: (aiCalls ?? []).length,
    aiCallErrorCount24h: (aiCalls ?? []).filter((c) => c.status === "error").length,
    refundRequestCount: refundRequestCount ?? 0,
  };
}

export interface AdminCaseRow {
  id: string;
  title: string;
  stage: string;
  status: string;
  amountKr: number | null;
  userEmail: string;
  createdAt: string;
}

export async function listAdminCases(search: string): Promise<AdminCaseRow[]> {
  const supabase = createAdminClient();
  const [{ data: cases }, emailByUserId] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, stage, status, amount_kr, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    getUserEmailMap(),
  ]);

  const rows = (cases ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    stage: c.stage as string,
    status: c.status as string,
    amountKr: c.amount_kr as number | null,
    userEmail: emailByUserId.get(c.user_id as string) ?? "(ukjent bruker)",
    createdAt: c.created_at as string,
  }));

  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.title.toLowerCase().includes(needle) || r.userEmail.toLowerCase().includes(needle));
}

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  caseCount: number;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();
  const [{ data: usersData }, { data: cases }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("cases").select("user_id"),
  ]);

  const caseCountByUserId = new Map<string, number>();
  for (const c of cases ?? []) {
    const id = c.user_id as string;
    caseCountByUserId.set(id, (caseCountByUserId.get(id) ?? 0) + 1);
  }

  return (usersData?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(ingen e-post)",
      createdAt: u.created_at,
      caseCount: caseCountByUserId.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface AdminEscalationRow {
  id: string;
  caseId: string;
  caseTitle: string;
  userEmail: string;
  conversationId: string;
  messageContent: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
}

export async function listSupportEscalations(): Promise<AdminEscalationRow[]> {
  const supabase = createAdminClient();
  const [{ data: escalations }, emailByUserId] = await Promise.all([
    supabase
      .from("support_escalations")
      .select("id, case_id, user_id, conversation_id, message_id, reason, status, created_at, resolved_at")
      .order("created_at", { ascending: false }),
    getUserEmailMap(),
  ]);

  const rows = escalations ?? [];
  if (rows.length === 0) return [];

  const caseIds = [...new Set(rows.map((r) => r.case_id as string))];
  const messageIds = [...new Set(rows.map((r) => r.message_id as string))];
  const [{ data: cases }, { data: messages }] = await Promise.all([
    supabase.from("cases").select("id, title").in("id", caseIds),
    supabase.from("messages").select("id, content").in("id", messageIds),
  ]);
  const caseTitleById = new Map((cases ?? []).map((c) => [c.id as string, c.title as string]));
  const messageContentById = new Map((messages ?? []).map((m) => [m.id as string, m.content as string]));

  return rows.map((r) => ({
    id: r.id as string,
    caseId: r.case_id as string,
    caseTitle: caseTitleById.get(r.case_id as string) ?? "(slettet sak)",
    userEmail: emailByUserId.get(r.user_id as string) ?? "(ukjent bruker)",
    conversationId: r.conversation_id as string,
    messageContent: messageContentById.get(r.message_id as string) ?? "(melding ikke funnet)",
    reason: r.reason as string,
    status: r.status as "open" | "resolved",
    createdAt: r.created_at as string,
    resolvedAt: r.resolved_at as string | null,
  }));
}

export interface AdminCaseDetail {
  id: string;
  title: string;
  stage: string;
  status: string;
  taxType: string;
  taxPeriod: string | null;
  amountKr: number | null;
  userEmail: string;
  createdAt: string;
  claims: Awaited<ReturnType<typeof getClaimsWithStatus>>;
  conflicts: Awaited<ReturnType<typeof getCaseConflicts>>;
  documents: { id: string; fileName: string; status: string; uploadedAt: string }[];
  gaps: { id: string; description: string; status: string }[];
  purchases: { id: string; productCode: string; amountKr: number; status: string; createdAt: string }[];
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: string }[];
}

export async function getAdminCaseDetail(caseId: string): Promise<AdminCaseDetail | null> {
  const supabase = createAdminClient();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, title, stage, status, tax_type, tax_period, amount_kr, user_id, created_at")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const [
    claims,
    conflicts,
    { data: documents },
    { data: gaps },
    { data: purchases },
    { data: conversation },
    emailByUserId,
  ] = await Promise.all([
    getClaimsWithStatus(supabase, caseId),
    getCaseConflicts(supabase, caseId),
    supabase
      .from("documents")
      .select("id, original_filename, extraction_status, uploaded_at")
      .eq("case_id", caseId)
      .order("uploaded_at", { ascending: false }),
    supabase.from("documentation_gaps").select("id, description, status").eq("case_id", caseId),
    supabase
      .from("purchases")
      .select("id, product_code, amount_kr, status, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    supabase.from("conversations").select("id").eq("case_id", caseId).maybeSingle(),
    getUserEmailMap(),
  ]);

  let messages: AdminCaseDetail["messages"] = [];
  if (conversation) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    messages = (messageRows ?? []).map((m) => ({
      id: m.id as string,
      role: m.role as "user" | "assistant",
      content: m.content as string,
      createdAt: m.created_at as string,
    }));
  }

  return {
    id: caseRow.id,
    title: caseRow.title,
    stage: caseRow.stage,
    status: caseRow.status,
    taxType: caseRow.tax_type,
    taxPeriod: caseRow.tax_period,
    amountKr: caseRow.amount_kr,
    userEmail: emailByUserId.get(caseRow.user_id as string) ?? "(ukjent bruker)",
    createdAt: caseRow.created_at,
    claims,
    conflicts,
    documents: (documents ?? []).map((d) => ({
      id: d.id as string,
      fileName: d.original_filename as string,
      status: d.extraction_status as string,
      uploadedAt: d.uploaded_at as string,
    })),
    gaps: (gaps ?? []).map((g) => ({ id: g.id as string, description: g.description as string, status: g.status as string })),
    purchases: (purchases ?? []).map((p) => ({
      id: p.id as string,
      productCode: p.product_code as string,
      amountKr: p.amount_kr as number,
      status: p.status as string,
      createdAt: p.created_at as string,
    })),
    messages,
  };
}

export interface AdminRefundRequestRow {
  id: string;
  purchaseId: string | null;
  userEmail: string;
  caseId: string | null;
  caseTitle: string;
  productName: string;
  amountKr: number | null;
  purchaseStatus: string | null;
  reason: string | null;
  requestedAt: string;
}

/**
 * Refund requests aren't a table of their own yet -- they're
 * contact_messages rows written by requestRefund.ts, tagged with
 * REFUND_REQUEST_MARKER. The purchase/case/product/amount shown here come
 * from the real purchases row (looked up by the embedded purchase id),
 * not from re-parsing those fields out of the message text, so this stays
 * correct even if a product's name changes after the request was made.
 * There's no persisted status (Åpen/Under behandling/...) because that
 * needs a schema change that hasn't been approved yet -- see the Min side
 * follow-up round notes.
 */
export async function listRefundRequests(): Promise<AdminRefundRequestRow[]> {
  const supabase = createAdminClient();
  const [{ data: contactMessages }, emailByUserId] = await Promise.all([
    supabase
      .from("contact_messages")
      .select("id, email, message, created_at")
      .like("message", `${REFUND_REQUEST_MARKER}%`)
      .order("created_at", { ascending: false }),
    getUserEmailMap(),
  ]);

  const rows = contactMessages ?? [];
  if (rows.length === 0) return [];

  const parsed = rows.map((row) => ({ row, ...parseRefundRequestMessage(row.message as string) }));
  const purchaseIds = [...new Set(parsed.map((p) => p.purchaseId).filter((id): id is string => id != null))];

  const { data: purchases } =
    purchaseIds.length > 0
      ? await supabase
          .from("purchases")
          .select("id, user_id, case_id, amount_kr, status, product_code, products(name), cases(title)")
          .in("id", purchaseIds)
      : { data: [] };
  const purchaseById = new Map((purchases ?? []).map((p) => [p.id as string, p]));

  return parsed.map(({ row, purchaseId, note }) => {
    const purchase = purchaseId ? purchaseById.get(purchaseId) : undefined;
    return {
      id: row.id as string,
      purchaseId: purchaseId,
      userEmail: purchase
        ? (emailByUserId.get(purchase.user_id as string) ?? "(ukjent bruker)")
        : (row.email as string),
      caseId: purchase ? (purchase.case_id as string) : null,
      caseTitle: purchase ? ((purchase.cases as unknown as { title: string } | null)?.title ?? "(slettet sak)") : "-",
      productName: purchase
        ? ((purchase.products as unknown as { name: string } | null)?.name ?? (purchase.product_code as string))
        : "(kjøp ikke funnet)",
      amountKr: purchase ? (purchase.amount_kr as number) : null,
      purchaseStatus: purchase ? (purchase.status as string) : null,
      reason: note,
      requestedAt: row.created_at as string,
    };
  });
}
