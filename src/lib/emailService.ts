import type { EmailConfig, PasswordRecoveryResult } from "../types";

const STORAGE_KEY = "GENESIS_EMAIL_CONFIG";

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  activo: true,
  proveedor: "simulado",
  resendApiKey: "",
  resendFromEmail: "Genesis Taller <onboarding@resend.dev>",
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  webhookUrl: "",
};

function limpiarConfig(config: Partial<EmailConfig>): EmailConfig {
  return {
    activo: Boolean(config.activo),
    proveedor:
      config.proveedor === "resend" ||
      config.proveedor === "emailjs" ||
      config.proveedor === "webhook"
        ? config.proveedor
        : "simulado",
    resendApiKey: "",
    resendFromEmail: config.resendFromEmail || DEFAULT_EMAIL_CONFIG.resendFromEmail,
    emailjsServiceId: config.emailjsServiceId || "",
    emailjsTemplateId: config.emailjsTemplateId || "",
    emailjsPublicKey: config.emailjsPublicKey || "",
    webhookUrl: "",
  };
}

export function getEmailConfig(): EmailConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EMAIL_CONFIG;
    const config = limpiarConfig(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  } catch (error) {
    console.error("Error al leer configuración de correo:", error);
    return DEFAULT_EMAIL_CONFIG;
  }
}

export function limpiarCredencialesCorreoDelNavegador(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limpiarConfig(JSON.parse(raw))));
    }
  } catch (error) {
    console.error("No se pudieron limpiar las credenciales de correo del navegador:", error);
  }
}

export function saveEmailConfig(config: EmailConfig): void {
  try {
    const safeConfig = limpiarConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("genesis_email_config_changed", { detail: safeConfig })
      );
    }
  } catch (error) {
    console.error("Error al guardar configuración de correo:", error);
  }
}

export async function enviarCorreoRecuperacion(
  destinatario: string,
  nombreUsuario: string,
  passwordTemporal: string,
  configOverride?: Partial<EmailConfig>
): Promise<PasswordRecoveryResult> {
  const config = limpiarConfig({ ...getEmailConfig(), ...configOverride });
  const usuario = destinatario.trim();

  if (!usuario) {
    return {
      ok: false,
      error: "No se especificó un destinatario válido.",
      emailEnviado: false,
      passwordTemporal,
      proveedor: config.proveedor,
      destinatario: usuario,
      mensaje: "Falta el destinatario para enviar el correo.",
    };
  }

  if (config.proveedor === "resend" || config.proveedor === "webhook") {
    return {
      ok: false,
      error: `${config.proveedor} debe configurarse en un servicio seguro del servidor.`,
      emailEnviado: false,
      passwordTemporal,
      proveedor: config.proveedor,
      destinatario: usuario,
      mensaje: "No se enviaron credenciales privadas desde el navegador.",
    };
  }

  if (config.proveedor === "emailjs") {
    if (!config.emailjsServiceId || !config.emailjsTemplateId || !config.emailjsPublicKey) {
      return {
        ok: false,
        error: "Faltan credenciales públicas de EmailJS.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "emailjs",
        destinatario: usuario,
        mensaje: "EmailJS no está configurado para enviar correos.",
      };
    }

    try {
      const emailjs = await import("@emailjs/browser");
      const response = await emailjs.send(
        config.emailjsServiceId.trim(),
        config.emailjsTemplateId.trim(),
        {
          user_name: nombreUsuario,
          user_email: usuario,
          password_temporal: passwordTemporal,
          message: `Tu contraseña temporal es ${passwordTemporal}`,
        },
        config.emailjsPublicKey.trim()
      );

      return response?.status === 200
        ? {
            ok: true,
            emailEnviado: true,
            passwordTemporal,
            proveedor: "emailjs",
            destinatario: usuario,
            mensaje: `Correo enviado exitosamente a ${usuario} vía EmailJS.`,
          }
        : {
            ok: false,
            error: "EmailJS respondió con un estado inesperado.",
            emailEnviado: false,
            passwordTemporal,
            proveedor: "emailjs",
            destinatario: usuario,
            mensaje: "No se pudo confirmar el envío por EmailJS.",
          };
    } catch (error) {
      console.error("Fallo al enviar correo con EmailJS:", error);
      return {
        ok: false,
        error: "No se pudo enviar el correo por EmailJS.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "emailjs",
        destinatario: usuario,
        mensaje: "No se pudo enviar el correo vía EmailJS.",
      };
    }
  }

  return {
    ok: true,
    emailEnviado: false,
    passwordTemporal,
    proveedor: "simulado",
    destinatario: usuario,
    mensaje: `Contraseña temporal generada para ${usuario}. Modo simulado; no se envió un correo.`,
  };
}
