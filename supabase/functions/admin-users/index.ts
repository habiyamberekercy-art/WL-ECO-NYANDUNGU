import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ROLES = ["admin", "manager", "public", "researcher", "government"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Avoids look-alike characters so credentials can be read aloud or retyped.
function generatePassword(length = 14) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const chars = sets.map((s, i) => s[bytes[i] % s.length]);
  for (let i = sets.length; i < length; i++) chars.push(all[bytes[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
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
    const actorId = userData.user.id;

    const { data: actor, error: actorError } = await admin
      .from("profiles")
      .select("role, suspended")
      .eq("id", actorId)
      .maybeSingle();
    if (actorError) return json(500, { error: "Request failed" });
    if (!actor || actor.role !== "admin" || actor.suspended) return json(403, { error: "Forbidden" });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid request body" });
    }

    const audit = (event_type: string, message: string, metadata: Record<string, unknown>) =>
      admin.from("audit_logs").insert({ actor_id: actorId, event_type, message, metadata });

    if (body.action === "create_user") {
      const email = str(body.email, 254).toLowerCase();
      const fullName = str(body.full_name, 120);
      const organization = str(body.organization, 160);
      const role = str(body.role, 20);
      const requestId = str(body.request_id, 36);

      if (!EMAIL_RE.test(email)) return json(400, { error: "Please enter a valid email address." });
      if (fullName.length < 2) return json(400, { error: "Please enter the person's full name." });
      if (!ROLES.includes(role)) return json(400, { error: "Please choose a valid role." });
      if (requestId && !UUID_RE.test(requestId)) return json(400, { error: "Invalid request id" });

      const password = generatePassword();
      const { error: provError } = await admin.from("account_provisions").upsert({
        email,
        full_name: fullName,
        role,
        organization,
        created_by: actorId,
        created_at: new Date().toISOString(),
      });
      if (provError) {
        console.error("provision failed", provError);
        return json(500, { error: "Could not create the account." });
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created?.user) {
        await admin.from("account_provisions").delete().eq("email", email);
        const msg = createError?.message ?? "";
        if (/already|registered|exists/i.test(msg)) {
          return json(409, { error: "An account with this email already exists." });
        }
        console.error("createUser failed", createError);
        return json(500, { error: "Could not create the account." });
      }

      if (requestId) {
        await admin
          .from("access_requests")
          .update({ status: "approved", reviewed_by: actorId, reviewed_at: new Date().toISOString() })
          .eq("id", requestId)
          .eq("status", "pending");
      }

      await audit("user_created", `Created ${role} account for ${email}`, {
        user_id: created.user.id,
        role,
        request_id: requestId || null,
      });

      return json(200, { ok: true, user_id: created.user.id, email, full_name: fullName, role, password });
    }

    if (body.action === "reset_password") {
      const userId = str(body.user_id, 36);
      if (!UUID_RE.test(userId)) return json(400, { error: "Invalid user id" });
      if (userId === actorId) return json(400, { error: "Use your own profile page to change your password." });

      const { data: target } = await admin
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", userId)
        .maybeSingle();
      if (!target) return json(404, { error: "User not found" });

      const password = generatePassword();
      const { error: updError } = await admin.auth.admin.updateUserById(userId, { password });
      if (updError) {
        console.error("reset password failed", updError);
        return json(500, { error: "Could not reset the password." });
      }
      await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
      await audit("password_reset", `Issued new temporary password for ${target.email}`, { user_id: userId });

      return json(200, { ok: true, user_id: userId, email: target.email, full_name: target.full_name, role: target.role, password });
    }

    if (body.action === "decline_request") {
      const requestId = str(body.request_id, 36);
      if (!UUID_RE.test(requestId)) return json(400, { error: "Invalid request id" });
      const { data: updated, error: decError } = await admin
        .from("access_requests")
        .update({ status: "declined", reviewed_by: actorId, reviewed_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("email")
        .maybeSingle();
      if (decError) return json(500, { error: "Request failed" });
      if (!updated) return json(404, { error: "This request was already handled." });
      await audit("access_request_declined", `Declined access request from ${updated.email}`, { request_id: requestId });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("admin-users error", err);
    return json(500, { error: "Request failed" });
  }
});
