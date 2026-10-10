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

export function getEmailConfig(): EmailConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EMAIL_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EMAIL_CONFIG,
      ...parsed,
    };
  } catch (error) {
    console.error("Error al leer configuración de correo:", error);
    return DEFAULT_EMAIL_CONFIG;
  }
}

export function saveEmailConfig(config: EmailConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("genesis_email_config_changed", { detail: config }));
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
  const config = { ...getEmailConfig(), ...configOverride };
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

  const cuerpoHtml = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Recuperación de contraseña</h2>
      <p>Hola <strong>${nombreUsuario}</strong>,</p>
      <p>Tu contraseña temporal es:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 16px 0;">${passwordTemporal}</p>
      <p>Se te pedirá cambiarla al iniciar sesión.</p>
    </div>
  `;

  if (config.proveedor === "resend") {
    if (!config.resendApiKey?.trim()) {
      return {
        ok: false,
        error: "Falta la API key de Resend.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "resend",
        destinatario: usuario,
        mensaje: "No se pudo enviar el correo porque Resend no está configurado.",
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.resendFromEmail || "Genesis Taller <onboarding@resend.dev>",
          to: [usuario],
          subject: "Recuperación de contraseña - Sistema Genesis",
          html: cuerpoHtml,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.message || `HTTP ${response.status}`;
        return {
          ok: false,
          error: `Error al enviar con Resend: ${message}`,
          emailEnviado: false,
          passwordTemporal,
          proveedor: "resend",
          destinatario: usuario,
          mensaje: `No se pudo enviar el correo a ${usuario} vía Resend.`,
        };
      }

      return {
        ok: true,
        emailEnviado: true,
        passwordTemporal,
        proveedor: "resend",
        destinatario: usuario,
        mensaje: `Correo enviado exitosamente a ${usuario} vía Resend.`,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: `Fallo al llamar a Resend: ${error?.message || "Desconocido"}`,
        emailEnviado: false,
        passwordTemporal,
        proveedor: "resend",
        destinatario: usuario,
        mensaje: "Hubo un problema al enviar el correo con Resend.",
      };
    }
  }

  if (config.proveedor === "emailjs") {
    if (!config.emailjsServiceId?.trim() || !config.emailjsTemplateId?.trim() || !config.emailjsPublicKey?.trim()) {
      return {
        ok: false,
        error: "Faltan credenciales de EmailJS.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "emailjs",
        destinatario: usuario,
        mensaje: "EmailJS no está configurado para enviar correos reales.",
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

      if (response?.status === 200) {
        return {
          ok: true,
          emailEnviado: true,
          passwordTemporal,
          proveedor: "emailjs",
          destinatario: usuario,
          mensaje: `Correo enviado exitosamente a ${usuario} vía EmailJS.`,
        };
      }

      return {
        ok: false,
        error: "EmailJS respondió con un estado inesperado.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "emailjs",
        destinatario: usuario,
        mensaje: "No se pudo confirmar el envío por EmailJS.",
      };
    } catch (error: any) {
      return {
        ok: false,
        error: `Fallo al llamar a EmailJS: ${error?.message || "Desconocido"}`,
        emailEnviado: false,
        passwordTemporal,
        proveedor: "emailjs",
        destinatario: usuario,
        mensaje: "No se pudo enviar el correo vía EmailJS.",
      };
    }
  }

  if (config.proveedor === "webhook") {
    if (!config.webhookUrl?.trim()) {
      return {
        ok: false,
        error: "Falta la URL del webhook.",
        emailEnviado: false,
        passwordTemporal,
        proveedor: "webhook",
        destinatario: usuario,
        mensaje: "La configuración del webhook está incompleta.",
      };
    }

    try {
      const response = await fetch(config.webhookUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinatario: usuario,
          nombreUsuario,
          passwordTemporal,
          asunto: "Recuperación de contraseña",
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `Fallo al llamar al webhook: HTTP ${response.status}`,
          emailEnviado: false,
          passwordTemporal,
          proveedor: "webhook",
          destinatario: usuario,
          mensaje: "El webhook respondió con un error.",
        };
      }

      return {
        ok: true,
        emailEnviado: true,
        passwordTemporal,
        proveedor: "webhook",
        destinatario: usuario,
        mensaje: `Correo enviado exitosamente a ${usuario} vía webhook.`,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: `Fallo al llamar al webhook: ${error?.message || "Desconocido"}`,
        emailEnviado: false,
        passwordTemporal,
        proveedor: "webhook",
        destinatario: usuario,
        mensaje: "No se pudo contactar al webhook configurado.",
      };
    }
  }

  return {
    ok: true,
    emailEnviado: false,
    passwordTemporal,
    proveedor: "simulado",
    destinatario: usuario,
    mensaje: `Contraseña temporal generada para ${usuario}. (Modo Simulado: puedes configurar Resend o EmailJS para entrega real a buzón).`,
  };
}
