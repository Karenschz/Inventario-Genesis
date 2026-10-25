import { useState, useEffect } from "react";
import type { WhatsAppConfig } from "../types";
import { probarConexionWhatsApp } from "../lib/whatsappService";

interface ModalConfigWhatsAppProps {
  isOpen: boolean;
  onClose: () => void;
  configActual: WhatsAppConfig;
  onGuardar: (nuevaConfig: WhatsAppConfig) => void;
}

export default function ModalConfigWhatsApp({
  isOpen,
  onClose,
  configActual,
  onGuardar,
}: ModalConfigWhatsAppProps) {
  const [form, setForm] = useState<WhatsAppConfig>(configActual);
  const [probando, setProbando] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(configActual);
      setResultadoPrueba(null);
    }
  }, [isOpen, configActual]);

  if (!isOpen) return null;

  const handleProbar = async () => {
    setProbando(true);
    setResultadoPrueba(null);
    try {
      const res = await probarConexionWhatsApp(form);
      if (res.ok) {
        setResultadoPrueba({
          tipo: "exito",
          mensaje:
            "¡Mensaje de prueba enviado exitosamente a WhatsApp! Revisa tu chat para confirmarlo.",
        });
      } else {
        setResultadoPrueba({
          tipo: "error",
          mensaje: res.error || "No se pudo entregar el mensaje de prueba.",
        });
      }
    } catch (err: any) {
      setResultadoPrueba({
        tipo: "error",
        mensaje: err?.message || "Error inesperado al probar conexión.",
      });
    } finally {
      setProbando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.94 7.44 8.68 7.5 8.46 7.74C8.24 7.98 7.62 8.56 7.62 9.73C7.62 10.9 8.47 12.03 8.6 12.18C8.73 12.33 10.27 14.7 12.63 15.72C13.2 15.96 13.63 16.11 13.98 16.22C14.54 16.4 15.06 16.37 15.46 16.31C15.92 16.24 16.85 15.75 17.04 15.2C17.24 14.66 17.24 14.19 17.18 14.09C17.12 13.99 16.96 13.94 16.71 13.81C16.47 13.69 15.26 13.09 15.03 13.01C14.81 12.92 14.64 12.88 14.48 13.12C14.32 13.36 13.85 13.94 13.71 14.09C13.56 14.25 13.42 14.27 13.17 14.15C12.93 14.02 12.14 13.77 11.21 12.93C10.48 12.28 9.99 11.48 9.85 11.23C9.7 10.99 9.83 10.86 9.96 10.74C10.07 10.63 10.2 10.45 10.33 10.31C10.45 10.16 10.49 10.06 10.58 9.88C10.66 9.69 10.62 9.53 10.56 9.41C10.5 9.29 10.03 8.14 9.83 7.67C9.64 7.21 9.45 7.27 9.3 7.26C9.17 7.26 9.01 7.25 8.85 7.25" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Alertas por WhatsApp
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Notificación automática cuando el stock de un producto llegue a cero
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Activar / Desactivar Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="whatsapp-switch"
                className="text-sm font-semibold text-[var(--foreground)] cursor-pointer"
              >
                Habilitar alertas automáticas
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Envía un WhatsApp inmediatamente cuando una venta o salida deje el inventario en 0.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="whatsapp-switch"
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Guía Rápida UltraMsg */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-200">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              <span>Conexión mediante código QR (UltraMsg):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-300/90">
              1. Crea una instancia gratuita en{" "}
              <a
                href="https://ultramsg.com"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold hover:text-white"
              >
                ultramsg.com
              </a>
              .<br />
              2. Escanea el código QR con el WhatsApp de tu teléfono.<br />
              3. Guarda <strong>Instance ID</strong> y <strong>Token</strong> como secretos de la Edge Function en Supabase. No los pegues en esta pantalla.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Las credenciales no se guardan en el navegador. Configúralas en Supabase como secretos
            <code className="mx-1">ULTRAMSG_INSTANCE_ID</code> y
            <code className="mx-1">ULTRAMSG_TOKEN</code>.
          </div>

          {/* Tipo de Destinatario */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Tipo de Destinatario
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, tipoDestinatario: "individual" })}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  form.tipoDestinatario === "individual"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-slate-500"
                }`}
              >
                📱 Número Personal / Admin
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipoDestinatario: "grupo" })}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  form.tipoDestinatario === "grupo"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-slate-500"
                }`}
              >
                👥 Grupo de WhatsApp
              </button>
            </div>
          </div>

          {/* Campo Destinatario */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                {form.tipoDestinatario === "individual"
                  ? "Número de Teléfono (con código de país) *"
                  : "Chat ID del Grupo de WhatsApp *"}
              </label>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {form.tipoDestinatario === "individual"
                  ? "Ej: 50212345678"
                  : "Ej: 120363028392@g.us"}
              </span>
            </div>
            <input
              type="text"
              placeholder={
                form.tipoDestinatario === "individual"
                  ? "50212345678 (código país + número sin espacios ni signos)"
                  : "1203630283921829@g.us"
              }
              value={form.destinatario}
              onChange={(e) => setForm({ ...form, destinatario: e.target.value.trim() })}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
            {form.tipoDestinatario === "grupo" && (
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                Tip: En el panel de UltraMsg &gt; pestaña <em>Chats</em> verás los Chat IDs de tus grupos terminados en <code>@g.us</code>.
              </p>
            )}
          </div>

          {/* Opción de Stock Mínimo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="notificarStockMinimo"
              checked={form.notificarStockMinimo || false}
              onChange={(e) =>
                setForm({ ...form, notificarStockMinimo: e.target.checked })
              }
              className="w-4 h-4 rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500/20"
            />
            <label
              htmlFor="notificarStockMinimo"
              className="text-xs text-[var(--foreground)] cursor-pointer select-none"
            >
              Alertar también cuando un producto alcance su stock mínimo de seguridad
            </label>
          </div>

          {/* Feedback de la prueba */}
          {resultadoPrueba && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                resultadoPrueba.tipo === "exito"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {resultadoPrueba.tipo === "exito" ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="flex-1 leading-relaxed">{resultadoPrueba.mensaje}</p>
            </div>
          )}

          {/* Botón de Prueba */}
          <div className="pt-1">
            <button
              type="button"
              disabled={probando || !form.destinatario}
              onClick={handleProbar}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {probando ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Enviando mensaje de prueba...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
                  </svg>
                  <span>Probar Envío a WhatsApp Ahora</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
}
