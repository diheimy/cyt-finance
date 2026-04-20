import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

interface InvitePayload {
  type: "INSERT";
  table: "invites";
  record: {
    id: string;
    workspace_id: string;
    email: string;
    token: string;
    expires_at: string;
    invited_by: string;
  };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "CYT Finance <noreply@cyt.finance>";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid_json", { status: 400 });
  }

  const invite = payload.record;
  if (!invite?.email || !invite?.token) {
    return new Response("missing_fields", { status: 400 });
  }

  const link = `${APP_URL}/accept-invite?token=${encodeURIComponent(invite.token)}`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-family:Georgia,serif;color:#0f172a">CYT Finance</h1>
      <p>Você foi convidado para um workspace familiar no CYT Finance.</p>
      <p>Clique no botão abaixo para aceitar o convite (válido por 7 dias):</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#10b981;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Aceitar convite
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">Se o botão não funcionar, copie este link:<br><a href="${link}">${link}</a></p>
    </div>
  `.trim();

  if (!RESEND_API_KEY) {
    console.log("[dev] RESEND_API_KEY não configurada — convite registrado mas não enviado");
    console.log(`[dev] link: ${link}`);
    return new Response(JSON.stringify({ ok: true, dev_mode: true, link }), {
      headers: { "content-type": "application/json" }
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: invite.email,
      subject: "Você foi convidado para um workspace no CYT Finance",
      html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`resend_error: ${res.status} ${err}`);
    return new Response(`resend_error: ${res.status}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" }
  });
});
