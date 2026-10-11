import { useState } from "react";
import { useApp } from "../context";
import type { PasswordRecoveryResult } from "../types";

export default function Login() {
  const { login, solicitarRecuperacionPassword, tema, toggleTema } = useApp();
  
  // Estado para la vista de login o recuperación
  const [modo, setModo] = useState<"login" | "recuperar">("login");

  // Campos de login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Campos de recuperación
  const [emailRecuperar, setEmailRecuperar] = useState("");
  const [loadingRecuperar, setLoadingRecuperar] = useState(false);
  const [errorRecuperar, setErrorRecuperar] = useState("");
  const [resultadoRecuperacion, setResultadoRecuperacion] = useState<PasswordRecoveryResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setErrorLogin("");
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setErrorLogin(res.error || "Credenciales incorrectas o usuario inactivo.");
      }
    } catch {
      setErrorLogin("Error de conexión al intentar iniciar sesión.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRecuperar(true);
    setErrorRecuperar("");
    setResultadoRecuperacion(null);
    setCopiado(false);

    try {
      const res = await solicitarRecuperacionPassword(emailRecuperar);
      if (res.ok) {
        setResultadoRecuperacion(res);
      } else {
        setErrorRecuperar(res.error || "No se pudo procesar la recuperación de contraseña.");
      }
    } catch {
      setErrorRecuperar("Error inesperado al conectar con el servidor.");
    } finally {
      setLoadingRecuperar(false);
    }
  };

  const handleCopiarClave = () => {
    if (resultadoRecuperacion?.passwordTemporal) {
      navigator.clipboard.writeText(resultadoRecuperacion.passwordTemporal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleUsarClaveEIniciar = () => {
    if (resultadoRecuperacion?.passwordTemporal && emailRecuperar) {
      setEmail(emailRecuperar);
      setPassword(resultadoRecuperacion.passwordTemporal);
      setModo("login");
      setResultadoRecuperacion(null);
      setErrorLogin("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative">
      {/* Botón de Alternancia de Tema */}
      <button
        onClick={toggleTema}
        title={tema === "oscuro" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        className="absolute top-4 right-4 p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors flex items-center gap-2 text-xs font-medium shadow-sm"
      >
        {tema === "oscuro" ? (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
              <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2Zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15Zm-8-5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 10Zm13 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 15 10Zm-10.364-5.636a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.06 0l1.06 1.061a.75.75 0 0 1-1.06 1.06l-1.06-1.061a.75.75 0 0 1 0-1.06ZM4.636 15.364a.75.75 0 0 1 0-1.06l1.06-1.061a.75.75 0 1 1 1.061 1.06l-1.06 1.061a.75.75 0 0 1-1.061 0Zm9.193-9.193a.75.75 0 0 1 0-1.06l1.061-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.061a.75.75 0 0 1-1.061 0ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            </svg>
            <span>Modo claro</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500">
              <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .862.243 7.5 7.5 0 0 0 10.436 10.436.75.75 0 0 1 1.006.96 9.5 9.5 0 1 1-12.063-12.063a.75.75 0 0 1 .759.424Z" clipRule="evenodd" />
            </svg>
            <span>Modo oscuro</span>
          </>
        )}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo / Marca */}
        <div className="mb-6 text-center">
          <img 
            src="/logo.jpeg" 
            alt="Genesis Servicios Automotriz" 
            className="w-auto h-32 mx-auto mb-2 object-contain"
          />
          <p className="text-[var(--muted-foreground)] text-xs tracking-wide uppercase font-medium">
            Sistema de inventario automotriz
          </p>
        </div>

        {/* Tarjeta Principal */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-7 shadow-xl">
          {modo === "login" ? (
            /* Vista 1: Iniciar Sesión */
            <div>
              <div className="mb-5">
                <h2 className="text-base font-semibold text-[var(--foreground)]">Iniciar sesión</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Ingresa tus credenciales para acceder
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorLogin(""); }}
                    placeholder="usuario@taller.com"
                    required
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailRecuperar(email);
                        setResultadoRecuperacion(null);
                        setErrorRecuperar("");
                        setModo("recuperar");
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorLogin(""); }}
                      placeholder="••••••••"
                      required
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded"
                      title={mostrarPassword ? "Ocultar" : "Mostrar"}
                    >
                      {mostrarPassword ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.375l1.091 1.091a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                          <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {errorLogin && (
                  <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2.5 text-xs text-red-400">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <span>{errorLogin}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingLogin}
                  className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 mt-2 cursor-pointer shadow-md"
                >
                  {loadingLogin ? "Verificando..." : "Entrar al sistema"}
                </button>
              </form>
            </div>
          ) : (
            /* Vista 2: Recuperar Contraseña */
            <div>
              <div className="mb-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--foreground)]">Recuperar contraseña</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                    Te enviaremos un enlace seguro a tu correo para que puedas crear una contraseña nueva.
                  </p>
                </div>
              </div>

              {!resultadoRecuperacion ? (
                <form onSubmit={handleRecuperar} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      Correo electrónico registrado
                    </label>
                    <input
                      type="email"
                      value={emailRecuperar}
                      onChange={(e) => { setEmailRecuperar(e.target.value); setErrorRecuperar(""); }}
                      placeholder="ejemplo@taller.com"
                      required
                      autoFocus
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>

                  {errorRecuperar && (
                    <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2.5 text-xs text-red-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                      <span>{errorRecuperar}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loadingRecuperar}
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm py-2.5 rounded-lg active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer shadow-md"
                  >
                    {loadingRecuperar ? "Enviando enlace..." : "Enviar enlace de recuperación"}
                  </button>
                </form>
              ) : (
                /* Resultado Exitoso de Recuperación */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-bold text-emerald-300">¡Correo enviado exitosamente!</span>
                    </div>
                    <p className="text-xs text-emerald-200/90 leading-relaxed">
                      Se envió un enlace de recuperación a <strong className="text-emerald-300">{emailRecuperar}</strong>. Ábrelo para elegir una contraseña nueva.
                    </p>
                    <p className="text-[11px] text-emerald-300/80 mt-2 leading-relaxed">
                      Revisa tu bandeja de entrada o la carpeta de spam. El enlace te llevará al formulario para guardar tu contraseña.
                    </p>
                  </div>

                  {/* Botón para regresar al login */}
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(emailRecuperar);
                      setPassword("");
                      setModo("login");
                      setResultadoRecuperacion(null);
                      setErrorLogin("");
                    }}
                    className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-xs py-2.5 rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                    </svg>
                    <span>Ir a Iniciar Sesión</span>
                  </button>
                </div>
              )}

              {/* Botón para volver al login */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setModo("login");
                    setErrorRecuperar("");
                    setResultadoRecuperacion(null);
                  }}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                  </svg>
                  <span>Volver a iniciar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie de página */}
        <footer style={{ textAlign: "center", padding: "1rem", fontSize: "0.9rem" }} className="text-[var(--muted-foreground)] mt-6">
          <p>© 2026 Sistema. Desarrollado por estudiantes de la <strong>Universidad Luterana Salvadoreña (ULS)</strong>.</p>
        </footer>
      </div>
    </div>
  );
}