import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
  const token = Deno.env.get("ULTRAMSG_TOKEN");

  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ ok: false, error: "Sesión no autorizada." }, 401);
  }
  if (!instanceId || !token) {
    return jsonResponse({ ok: false, error: "WhatsApp no está configurado en el servidor." }, 503);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ ok: false, error: "La sesión expiró. Inicia sesión nuevamente." }, 401);
  }

  const { data: profile, error: profileError } = await userClient
    .from("usuarios")
    .select("activo, rol")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("No se pudo comprobar el perfil para WhatsApp:", profileError);
    return jsonResponse({ ok: false, error: "No se pudo validar el permiso de envío." }, 403);
  }
  if (!profile?.activo) {
    return jsonResponse({ ok: false, error: "La cuenta no está activa." }, 403);
  }

  let body: { tipo?: unknown; destinatario?: unknown; mensaje?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Solicitud inválida." }, 400);
  }

  if (
    (body.tipo !== "prueba" && body.tipo !== "alerta") ||
    typeof body.destinatario !== "string" ||
    body.destinatario.length < 5 ||
    body.destinatario.length > 100 ||
    typeof body.mensaje !== "string" ||
    body.mensaje.length === 0 ||
    body.mensaje.length > 4000
  ) {
    return jsonResponse({ ok: false, error: "Los datos del mensaje no son válidos." }, 400);
  }
  if (body.tipo === "prueba" && profile.rol !== "gerente") {
    return jsonResponse({ ok: false, error: "Solo un gerente puede probar la conexión." }, 403);
  }

  const form = new URLSearchParams({
    token,
    to: body.destinatario,
    body: body.mensaje,
    priority: "10",
  });

  try {
    const response = await fetch(
      `https://api.ultramsg.com/${encodeURIComponent(instanceId)}/messages/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.error) {
      console.error("UltraMsg rechazó el envío:", response.status);
      return jsonResponse({ ok: false, error: "UltraMsg no pudo enviar el mensaje." }, 502);
    }

    return jsonResponse({ ok: true, messageId: result?.id });
  } catch (error) {
    console.error("Fallo al contactar UltraMsg:", error);
    return jsonResponse({ ok: false, error: "No se pudo contactar UltraMsg." }, 502);
  }
});
