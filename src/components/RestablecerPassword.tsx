import { useState } from "react";
import { useApp } from "../context";

export default function RestablecerPassword() {
  const { cambiarMiPassword, setDebeCambiarPassword, tema, toggleTema } = useApp();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const result = await cambiarMiPassword(password, true);
      if (!result.ok) {
        setError(result.error || "No se pudo actualizar la contraseña.");
        return;
      }
      setAviso(result.warning || "");
      setGuardada(true);
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setError("Ocurrió un error al guardar la contraseña. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleTema}
        title={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="absolute top-4 right-4 p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
      >
        {tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
      </button>

      <section className="w-full max-w-sm">
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

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-7 shadow-xl">
          {guardada ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.13a1 1 0 0 1-1.42.006l-3.93-3.87a1 1 0 1 1 1.404-1.426l3.22 3.173 6.376-6.43a1 1 0 0 1 1.414.003Z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">Contraseña actualizada</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-2 mb-6">
                Ya puedes continuar con tu nueva contraseña.
              </p>
              {aviso && (
                <p role="status" className="text-left text-xs text-amber-300 bg-amber-950/30 border border-amber-700/40 rounded-lg px-3 py-2.5 mb-4">
                  {aviso}
                </p>
              )}
              <button
                type="button"
                onClick={() => setDebeCambiarPassword(false)}
                className="btn-primary w-full"
              >
                Continuar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h1 className="text-base font-semibold text-[var(--foreground)]">Crear contraseña nueva</h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Define una contraseña nueva para continuar con tu cuenta.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                    Nueva contraseña
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmacion}
                    onChange={(event) => setConfirmacion(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Repite la contraseña"
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>

                {error && (
                  <p role="alert" className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2.5 text-xs text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar nueva contraseña"}
                </button>
              </form>
            </>
          )}
        </div>

        <footer className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          © 2026 Sistema de inventario Genesis
        </footer>
      </section>
    </main>
  );
}