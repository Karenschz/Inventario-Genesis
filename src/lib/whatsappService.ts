import type {
  WhatsAppConfig,
  WhatsAppNotificationPayload,
  WhatsAppSendResult,
} from "../types";

const STORAGE_KEY = "GENESIS_WHATSAPP_CONFIG";

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  activo: false,
  instanceId: import.meta.env.VITE_WHATSAPP_INSTANCE_ID || "",
  token: import.meta.env.VITE_WHATSAPP_TOKEN || "",
  tipoDestinatario:
    (import.meta.env.VITE_WHATSAPP_TIPO_DESTINATARIO as "individual" | "grupo") ||
    "individual",
  destinatario: import.meta.env.VITE_WHATSAPP_DESTINATARIO || "",
  notificarStockMinimo: false,
};

/**
 * Obtiene la configuración de WhatsApp guardada en localStorage o fallback
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WHATSAPP_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WHATSAPP_CONFIG,
      ...parsed,
    };
  } catch (e) {
    console.error("Error al leer configuración de WhatsApp:", e);
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

/**
 * Guarda la configuración de WhatsApp en localStorage y emite evento reactivo
 */
export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent("genesis_whatsapp_config_changed", { detail: config })
    );
  } catch (e) {
    console.error("Error al guardar configuración de WhatsApp:", e);
  }
}

/**
 * Sanitiza el destinatario según si es número telefónico o ID de grupo
 */
export function sanitizarDestinatario(
  destinatario: string,
  tipo: "individual" | "grupo"
): string {
  const limpio = destinatario.trim();
  if (tipo === "grupo") {
    // Si no incluye el sufijo @g.us y parece un ID numérico de grupo, lo agregamos
    if (!limpio.includes("@")) {
      return `${limpio.replace(/[^0-9-]/g, "")}@g.us`;
    }
    return limpio;
  }

  // Número individual: remover +, espacios, guiones, paréntesis
  return limpio.replace(/[^0-9]/g, "");
}

/**
 * Envía un mensaje de texto a través del API de UltraMsg
 */
export async function enviarMensajeWhatsApp(
  to: string,
  body: string,
  configOverride?: Partial<WhatsAppConfig>
): Promise<WhatsAppSendResult> {
  const config = { ...getWhatsAppConfig(), ...configOverride };

  if (!config.instanceId?.trim() || !config.token?.trim()) {
    return {
      ok: false,
      error: "Credenciales incompletas: Se requiere Instance ID y Token de UltraMsg.",
    };
  }

  const destinatarioFinal = sanitizarDestinatario(to, config.tipoDestinatario);
  if (!destinatarioFinal) {
    return {
      ok: false,
      error: "Destinatario no especificado o formato inválido.",
    };
  }

  const instanceIdLimpio = config.instanceId.trim().replace(/^instance/, "instance");
  const url = `https://api.ultramsg.com/${instanceIdLimpio}/messages/chat`;

  const params = new URLSearchParams();
  params.append("token", config.token.trim());
  params.append("to", destinatarioFinal);
  params.append("body", body);
  params.append("priority", "10");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || (data && data.error)) {
      const errMsg =
        data?.error?.message ||
        data?.error ||
        `Error del servidor de WhatsApp (HTTP ${response.status})`;
      console.warn("Fallo al enviar mensaje por UltraMsg:", errMsg);
      return {
        ok: false,
        error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
      };
    }

    return {
      ok: true,
      messageId: data?.id ? String(data.id) : undefined,
    };
  } catch (err: any) {
    const errorMsg =
      err?.message || "No se pudo conectar con el servidor de UltraMsg. Verifique su conexión.";
    console.warn("Excepción al enviar WhatsApp:", errorMsg);
    return {
      ok: false,
      error: errorMsg,
    };
  }
}

/**
 * Envía alerta estructurada cuando un repuesto se agota (stock llega a 0)
 */
export async function enviarAlertaStockCero(
  payload: WhatsAppNotificationPayload,
  configOverride?: Partial<WhatsAppConfig>
): Promise<WhatsAppSendResult> {
  const config = { ...getWhatsAppConfig(), ...configOverride };

  if (!config.activo) {
    return { ok: false, error: "Alertas de WhatsApp desactivadas en la configuración." };
  }

  const sucursalTexto =
    payload.sucursal === "sucursal1"
      ? "Sucursal 1 - Central"
      : "Sucursal 2 - Norte";

  const mensaje = [
    "🚨 *¡ALERTA DE STOCK AGOTADO!* 🚨",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `📦 *Producto:* ${payload.repuestoNombre}`,
    `🏷️ *Código:* ${payload.repuestoCodigo}`,
    `🏢 *Sucursal:* ${sucursalTexto}`,
    `📉 *Stock resultante:* 0 unidades`,
    `📉 *Cantidad descontada:* ${payload.cantidadSalida}`,
    `👤 *Operador:* ${payload.usuarioNombre}`,
    `📝 *Motivo:* ${payload.motivo}${payload.folioReferencia ? ` (Folio: ${payload.folioReferencia})` : ""}`,
    `⏰ *Fecha:* ${payload.fecha}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "⚠️ *Acción:* El producto está agotado. Se requiere gestionar reabastecimiento.",
  ].join("\n");

  return await enviarMensajeWhatsApp(config.destinatario, mensaje, config);
}

/**
 * Envía un mensaje de prueba para validar que el token y destinatario funcionan
 */
export async function probarConexionWhatsApp(
  configOverride?: Partial<WhatsAppConfig>
): Promise<WhatsAppSendResult> {
  const config = { ...getWhatsAppConfig(), ...configOverride };

  const ahora = new Date();
  const fechaHora = ahora.toLocaleString("es-GT", {
    dateStyle: "short",
    timeStyle: "medium",
  });

  const mensajePrueba = [
    "✅ *PRUEBA DE CONEXIÓN - SISTEMA GÉNESIS*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "¡Tu número o grupo de WhatsApp ha sido vinculado exitosamente!",
    "A partir de ahora recibirás alertas automáticas cuando un repuesto agote sus existencias.",
    `⏰ *Hora de prueba:* ${fechaHora}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "Sistema de Inventario Repuestos y Herramientas",
  ].join("\n");

  return await enviarMensajeWhatsApp(config.destinatario, mensajePrueba, config);
}
