import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STATUSES = ["pending", "investigating", "resolved", "dismissed"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Unauthorized" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json(401, { error: "Unauthorized" });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, suspended")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError) return json(500, { error: "Request failed" });
    if (!profile || profile.role !== "admin" || profile.suspended) return json(403, { error: "Forbidden" });

    let body: { action?: unknown; report_id?: unknown; status?: unknown; note?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request body" });
    }

    const reportId = typeof body.report_id === "string" ? body.report_id : "";
    if (!UUID_RE.test(reportId)) return json(400, { error: "Invalid report id" });

    let result;
    if (body.action === "update_status") {
      if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
        return json(400, { error: "Invalid status" });
      }
      result = await admin.rpc("admin_set_report_status", {
        p_report_id: reportId,
        p_status: body.status,
        p_actor: userData.user.id,
      });
    } else if (body.action === "delete") {
      const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
      result = await admin.rpc("admin_delete_report", {
        p_report_id: reportId,
        p_actor: userData.user.id,
        p_note: note,
      });
    } else {
      return json(400, { error: "Unknown action" });
    }

    if (result.error) {
      if (result.error.code === "P0002") return json(404, { error: "Report not found" });
      if (result.error.code === "42501") return json(403, { error: "Forbidden" });
      if (result.error.code === "22023") return json(400, { error: "Invalid status" });
      console.error("report-admin rpc failed", result.error);
      return json(500, { error: "Request failed" });
    }

    return json(200, { ok: true, result: result.data });
  } catch (err) {
    console.error("report-admin error", err);
    return json(500, { error: "Request failed" });
  }
});
