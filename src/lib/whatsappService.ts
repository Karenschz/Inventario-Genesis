import type {
  WhatsAppConfig,
  WhatsAppNotificationPayload,
  WhatsAppSendResult,
} from "../types";
import { supabase } from "./supabase";

const STORAGE_KEY = "GENESIS_WHATSAPP_CONFIG";

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  activo: false,
  tipoDestinatario: "individual",
  destinatario: "",
  notificarStockMinimo: false,
};

function limpiarConfig(config: Partial<WhatsAppConfig>): WhatsAppConfig {
  return {
    activo: Boolean(config.activo),
    tipoDestinatario: config.tipoDestinatario === "grupo" ? "grupo" : "individual",
    destinatario: typeof config.destinatario === "string" ? config.destinatario : "",
    notificarStockMinimo: Boolean(config.notificarStockMinimo),
  };
}

export function getWhatsAppConfig(): WhatsAppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WHATSAPP_CONFIG;
    const config = limpiarConfig(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  } catch (error) {
    console.error("Error al leer la configuración de WhatsApp:", error);
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  try {
    const safeConfig = limpiarConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
    window.dispatchEvent(
      new CustomEvent("genesis_whatsapp_config_changed", { detail: safeConfig })
    );
  } catch (error) {
    console.error("Error al guardar la configuración de WhatsApp:", error);
  }
}

export function sanitizarDestinatario(
  destinatario: string,
  tipo: "individual" | "grupo"
): string {
  const limpio = destinatario.trim();
  if (tipo === "grupo") {
    if (!limpio.includes("@")) {
      return `${limpio.replace(/[^0-9-]/g, "")}@g.us`;
    }
    return limpio;
  }

  return limpio.replace(/[^0-9]/g, "");
}

async function enviarPorFuncion(
  tipo: "prueba" | "alerta",
  destinatario: string,
  mensaje: string,
  tipoDestinatario: "individual" | "grupo"
): Promise<WhatsAppSendResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase no está configurado." };
  }

  const to = sanitizarDestinatario(destinatario, tipoDestinatario);
  if (!to) {
    return { ok: false, error: "Destinatario no especificado o formato inválido." };
  }

  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { tipo, destinatario: to, mensaje },
  });

  if (error) {
    console.error("Error al invocar la función segura de WhatsApp:", error);
    return { ok: false, error: "No se pudo contactar el servicio seguro de WhatsApp." };
  }

  if (!data?.ok) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "No se pudo enviar el mensaje.",
    };
  }

  return { ok: true, messageId: data.messageId ? String(data.messageId) : undefined };
}

export async function enviarAlertaStockCero(
  payload: WhatsAppNotificationPayload,
  configOverride?: Partial<WhatsAppConfig>
): Promise<WhatsAppSendResult> {
  const config = { ...getWhatsAppConfig(), ...configOverride };

  if (!config.activo) {
    return { ok: false, error: "Alertas de WhatsApp desactivadas en la configuración." };
  }

  const sucursalTexto =
    payload.sucursal === "sucursal1" ? "Sucursal 1 - Central" : "Sucursal 2 - Norte";
  const mensaje = [
    "🚨 *¡ALERTA DE STOCK AGOTADO!* 🚨",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `📦 *Producto:* ${payload.repuestoNombre}`,
    `🏷️ *Código:* ${payload.repuestoCodigo}`,
    `🏢 *Sucursal:* ${sucursalTexto}`,
    `📉 *Stock resultante:* ${payload.stockResultante} unidades`,
    `📉 *Cantidad descontada:* ${payload.cantidadSalida}`,
    `👤 *Operador:* ${payload.usuarioNombre}`,
    `📝 *Motivo:* ${payload.motivo}${payload.folioReferencia ? ` (Folio: ${payload.folioReferencia})` : ""}`,
    `⏰ *Fecha:* ${payload.fecha}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "⚠️ *Acción:* El producto está agotado. Se requiere gestionar reabastecimiento.",
  ].join("\n");

  return enviarPorFuncion(
    "alerta",
    config.destinatario,
    mensaje,
    config.tipoDestinatario
  );
}

export async function probarConexionWhatsApp(
  configOverride?: Partial<WhatsAppConfig>
): Promise<WhatsAppSendResult> {
  const config = { ...getWhatsAppConfig(), ...configOverride };
  const fechaHora = new Date().toLocaleString("es-GT", {
    dateStyle: "short",
    timeStyle: "medium",
  });
  const mensaje = [
    "✅ *PRUEBA DE CONEXIÓN - SISTEMA GÉNESIS*",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "¡Tu número o grupo de WhatsApp ha sido vinculado exitosamente!",
    `⏰ *Hora de prueba:* ${fechaHora}`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "Sistema de Inventario Repuestos y Herramientas",
  ].join("\n");

  return enviarPorFuncion("prueba", config.destinatario, mensaje, config.tipoDestinatario);
}
