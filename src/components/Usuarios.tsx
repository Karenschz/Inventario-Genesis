import { useState } from "react";
import { useApp } from "../context";
import { SUCURSALES } from "../data";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Usuario, Rol, Sucursal } from "../types";

const EMPTY: Omit<Usuario, "id"> = {
  nombre: "",
  email: "",
  password: "",
  rol: "vendedor",
  sucursal: "sucursal1",
  activo: true,
};

function Modal({
  titulo,
  usuario,
  onClose,
  onSave,
}: {
  titulo: string;
  usuario: Omit<Usuario, "id"> & { id?: string };
  onClose: () => void;
  onSave: (u: typeof usuario) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [form, setForm] = useState(usuario);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setError("");
    if (!form.nombre.trim() || !form.email.trim() || (!usuario.id && !form.password)) {
      setError("Completa los campos obligatorios.");
      return;
    }

    setGuardando(true);
    try {
      const result = await onSave(form);
      if (!result.ok) setError(result.error || "No se pudo guardar el usuario.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{titulo}</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className="input-field" placeholder="Nombre del empleado" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Correo electrónico *</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input-field" placeholder="usuario@taller.com" />
          </div>
          {usuario.id && isSupabaseConfigured ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              La contraseña se gestiona en Supabase Auth. Usa la opción de recuperación desde la lista de usuarios.
            </p>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                {usuario.id ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
              </label>
              <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rol</label>
              <select value={form.rol} onChange={(e) => set("rol", e.target.value as Rol)} className="input-field">
                <option value="gerente">Gerente</option>
                <option value="vendedor">Vendedor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Sucursal</label>
              <select value={form.sucursal} onChange={(e) => set("sucursal", e.target.value as Sucursal)} className="input-field">
                <option value="sucursal1">{SUCURSALES.sucursal1}</option>
                <option value="sucursal2">{SUCURSALES.sucursal2}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-[var(--secondary)] rounded-md">
            <button
              type="button"
              onClick={() => set("activo", !form.activo)}
              className={`relative w-9 h-5 rounded-full transition-colors ${form.activo ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-4" : ""}`} />
            </button>
            <span className="text-xs font-medium text-[var(--foreground)]">
              {form.activo ? "Usuario activo" : "Usuario inactivo"}
            </span>
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="btn-primary disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const {
    usuarioActual,
    usuarios,
    agregarUsuario,
    editarUsuario,
    toggleUsuario,
    eliminarUsuario,
    solicitarRecuperacionPassword,
  } = useApp();
  if (!usuarioActual || usuarioActual.rol !== "gerente") return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[var(--muted-foreground)]">Acceso restringido a gerentes.</p>
    </div>
  );

  const [modal, setModal] = useState<null | { tipo: "nuevo" | "editar"; data: Omit<Usuario, "id"> & { id?: string } }>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);
  const [filtroRol, setFiltroRol] = useState<"todos" | "gerente" | "vendedor">("todos");
  const [filtroSucursal, setFiltroSucursal] = useState<"todas" | "sucursal1" | "sucursal2">("todas");
  const [notifTemp, setNotifTemp] = useState<{ nombre: string; email: string; pass: string; enviada: boolean } | null>(null);
  const [enviandoTempId, setEnviandoTempId] = useState<string | null>(null);
  const [errorOperacion, setErrorOperacion] = useState("");

  const filtrados = usuarios.filter((u) => {
    const matchRol = filtroRol === "todos" || u.rol === filtroRol;
    const matchS = filtroSucursal === "todas" || u.sucursal === filtroSucursal;
    return matchRol && matchS;
  });

  const handleSave = async (data: Omit<Usuario, "id"> & { id?: string }) => {
    if (data.id) {
      const existing = usuarios.find((u) => u.id === data.id);
      const updated = { ...data };
      if (!updated.password && existing) updated.password = existing.password;
      await editarUsuario(updated as Usuario);
      setModal(null);
      return { ok: true };
    } else {
      const result = await agregarUsuario(data);
      if (!result.ok) return result;
    }
    setModal(null);
    return { ok: true };
  };

  const handleEnviarPassTemporal = async (u: Usuario) => {
    setEnviandoTempId(u.id);
    setNotifTemp(null);
    try {
      const res = await solicitarRecuperacionPassword(u.email);
      if (res.ok && res.passwordTemporal) {
        setNotifTemp({
          nombre: u.nombre,
          email: u.email,
          pass: res.passwordTemporal,
          enviada: Boolean(res.emailEnviado),
        });
      }
    } catch {
      // Ignorar
    } finally {
      setEnviandoTempId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {modal && (
        <Modal
          titulo={modal.tipo === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
          usuario={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Confirmación de eliminación */}
      {confirmarEliminar && (() => {
        const u = usuarios.find((x) => x.id === confirmarEliminar);
        if (!u) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">Eliminar usuario</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                ¿Estás seguro de que quieres eliminar a <span className="font-semibold text-[var(--foreground)]">{u.nombre}</span>?
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setConfirmarEliminar(null)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={async () => {
                    setErrorOperacion("");
                    try {
                      await eliminarUsuario(confirmarEliminar);
                      setConfirmarEliminar(null);
                    } catch (error) {
                      setErrorOperacion(
                        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="p-6 max-w-4xl mx-auto">
      {errorOperacion && (
        <p role="alert" className="mb-4 rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {errorOperacion}
        </p>
      )}
      <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl text-[var(--foreground)]">Usuarios</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Gestión de accesos y permisos</p>
          </div>
          <button onClick={() => setModal({ tipo: "nuevo", data: { ...EMPTY } })} className="btn-primary flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
            Nuevo usuario
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg">
            {(["todos", "gerente", "vendedor"] as const).map((r) => (
              <button key={r} onClick={() => setFiltroRol(r)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filtroRol === r ? "bg-[var(--card)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg">
            {(["todas", "sucursal1", "sucursal2"] as const).map((s) => (
              <button key={s} onClick={() => setFiltroSucursal(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtroSucursal === s ? "bg-[var(--card)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                {s === "todas" ? "Todas" : SUCURSALES[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total usuarios", value: usuarios.length },
            { label: "Gerentes", value: usuarios.filter((u) => u.rol === "gerente").length },
            { label: "Activos", value: usuarios.filter((u) => u.activo).length },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">{s.label}</span>
              <span className="font-mono-data font-bold text-lg text-[var(--foreground)]">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Notificación de envío de contraseña temporal */}
        {notifTemp && (
          <div className="mb-5 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-sky-300">
                  ¡Contraseña temporal autogenerada y enviada!
                </p>
                <p className="text-xs text-sky-200/90 mt-0.5">
                  La nueva clave temporal de acceso fue enviada directamente al correo registrado de <strong>{notifTemp.nombre}</strong> (<strong className="text-sky-300">{notifTemp.email}</strong>).
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                  Por seguridad, la contraseña no se muestra en pantalla. El empleado deberá revisar su bandeja de entrada o spam.
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotifTemp(null)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* User cards */}
        <div className="space-y-2">
          {filtrados.map((u) => (
            <div key={u.id} className={`bg-[var(--card)] border rounded-xl px-5 py-4 flex items-center gap-4 ${!u.activo ? "opacity-50 border-[var(--border)]" : "border-[var(--border)]"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.rol === "gerente" ? "bg-[var(--primary)]/20" : "bg-blue-500/20"}`}>
                <span className={`font-semibold text-sm ${u.rol === "gerente" ? "text-[var(--primary)]" : "text-blue-400"}`}>
                  {u.nombre.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-[var(--foreground)] text-sm">{u.nombre}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${u.rol === "gerente" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-blue-500/10 text-blue-400"}`}>
                    {u.rol}
                  </span>
                  {u.passwordTemporal && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Clave Temporal
                    </span>
                  )}
                  {!u.activo && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--muted)] text-[var(--muted-foreground)]">Inactivo</span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{u.email} · {SUCURSALES[u.sucursal]}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleEnviarPassTemporal(u)}
                  disabled={enviandoTempId === u.id || !u.activo}
                  title="Autogenerar y enviar contraseña temporal"
                  className="p-1.5 rounded-md hover:bg-amber-500/15 text-[var(--muted-foreground)] hover:text-amber-400 transition-colors disabled:opacity-40"
                >
                  {enviandoTempId === u.id ? (
                    <svg className="animate-spin w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setErrorOperacion("");
                    void toggleUsuario(u.id).catch((error) => {
                      setErrorOperacion(
                        error instanceof Error ? error.message : "No se pudo cambiar el estado del usuario."
                      );
                    });
                  }}
                  title={u.activo ? "Desactivar usuario" : "Activar usuario"}
                  className={`p-1.5 rounded-md transition-colors ${u.activo ? "hover:bg-yellow-950/30 text-[var(--muted-foreground)] hover:text-yellow-400" : "hover:bg-[var(--success)]/10 text-[var(--muted-foreground)] hover:text-[var(--success)]"}`}
                >
                  {u.activo ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setModal({ tipo: "editar", data: { ...u, password: "" } })}
                  className="p-1.5 rounded-md hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                </button>
                {!u.activo && (
                  <button
                    onClick={() => setConfirmarEliminar(u.id)}
                    title="Eliminar usuario"
                    className="p-1.5 rounded-md hover:bg-red-500/15 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Permissions reference */}
        <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-4">Referencia de permisos</h3>
          <div className="grid grid-cols-2 gap-6">
            {[
              {
                rol: "Gerente",
                color: "text-[var(--primary)]",
                permisos: [
                  "Ver todas las sucursales",
                  "Crear, editar y eliminar repuestos",
                  "Crear, editar y eliminar herramientas",
                  "Acceso completo a reportes",
                  "Gestionar usuarios",
                  "eliminar usuarios",
                  "Cambiar sucursal activa",
                ],
              },
              {
                rol: "Vendedor",
                color: "text-blue-400",
                permisos: [
                  "Ver su propia sucursal",
                  "Crear y editar repuestos",
                  "Crear y editar herramientas",
                  "Ver reportes de su sucursal",
                  "Sin acceso a usuarios",
                  "Sin acceso a eliminar registros",
                ],
              },
            ].map((r) => (
              <div key={r.rol}>
                <p className={`text-sm font-semibold ${r.color} mb-2`}>{r.rol}</p>
                <ul className="space-y-1.5">
                  {r.permisos.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0 text-[var(--border)]">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 4.78a.75.75 0 0 0-1.06-1.06L6.75 8.94 5.28 7.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.75Z" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
