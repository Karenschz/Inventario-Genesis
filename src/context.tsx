import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  Usuario,
  Repuesto,
  Herramienta,
  MovimientoInventario,
  TipoMovimiento,
  WhatsAppConfig,
} from "./types";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  enviarAlertaStockCero,
} from "./lib/whatsappService";
import {
  usuariosIniciales,
  repuestosIniciales,
  herramientasIniciales,
  movimientosIniciales,
} from "./data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  dbFetchRepuestos,
  dbFetchMovimientos,
  dbFetchHerramientas,
  dbFetchUsuarios,
  dbRegistrarMovimiento,
  dbCrearRepuesto,
  dbActualizarRepuesto,
  dbEliminarRepuesto,
  dbCrearHerramienta,
  dbActualizarHerramienta,
  dbEliminarHerramienta,
  dbCrearUsuario,
  dbActualizarUsuario,
  dbToggleUsuario,
  dbEliminarUsuario,
  dbProbarConexion,
  dbSembrarDatosIniciales,
  dbLoginUsuario,
  type ConnectionDiagnostic,
} from "./lib/supabaseService";

export type View =
  | "dashboard"
  | "inventario"
  | "movimientos"
  | "herramientas"
  | "reportes"
  | "usuarios";

interface AppState {
  usuarioActual: Usuario | null;
  usuarios: Usuario[];
  repuestos: Repuesto[];
  herramientas: Herramienta[];
  movimientos: MovimientoInventario[];
  vistaActual: View;
  tema: "oscuro" | "claro";
  toggleTema: () => void;
  supabaseConectado: boolean;
  sincronizando: boolean;
  diagnostico: ConnectionDiagnostic | null;
  probarConexion: () => Promise<ConnectionDiagnostic>;
  sembrarDatosSupabase: () => Promise<{ ok: boolean; message: string }>;
  sincronizarConSupabase: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setVista: (v: View) => void;
  agregarRepuesto: (r: Omit<Repuesto, "id">) => Promise<void>;
  editarRepuesto: (r: Repuesto) => Promise<void>;
  eliminarRepuesto: (id: string) => Promise<void>;
  registrarMovimiento: (params: {
    repuestoId: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    folioReferencia?: string;
    notas?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  agregarHerramienta: (h: Omit<Herramienta, "id">) => Promise<void>;
  editarHerramienta: (h: Herramienta) => Promise<void>;
  eliminarHerramienta: (id: string) => Promise<void>;
  agregarUsuario: (u: Omit<Usuario, "id">) => Promise<void>;
  editarUsuario: (u: Usuario) => Promise<void>;
  toggleUsuario: (id: string) => Promise<void>;
  eliminarUsuario: (id: string) => Promise<void>;
  whatsAppConfig: WhatsAppConfig;
  actualizarWhatsAppConfig: (config: WhatsAppConfig) => void;
}

// Helpers para gestión de sesión en Cookies de navegador (Formato JSON codificado con SameSite=Strict)
const COOKIE_NAME = "usuario_genesis_sesion";

function guardarSesionCookie(usuario: Usuario) {
  try {
    const jsonStr = encodeURIComponent(JSON.stringify(usuario));
    document.cookie = `${COOKIE_NAME}=${jsonStr}; path=/; SameSite=Strict;`;
  } catch {
    // Ignorar si el navegador bloquea las cookies
  }
}

function obtenerSesionCookie(): Usuario | null {
  try {
    const nameEQ = `${COOKIE_NAME}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        const raw = decodeURIComponent(c.substring(nameEQ.length));
        return JSON.parse(raw);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function eliminarSesionCookie() {
  try {
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict;`;
  } catch {
    // Ignorar
  }
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Ningún dato (usuarios, repuestos, herramientas, movimientos) se guarda en localStorage
  // La sesión del usuario se guarda estrictamente en formato JSON en sessionStorage + Cookie SameSite=Strict
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(() => {
    try {
      const savedSession = sessionStorage.getItem("usuario_genesis_sesion");
      if (savedSession) return JSON.parse(savedSession);

      const savedCookie = obtenerSesionCookie();
      if (savedCookie) return savedCookie;

      return null;
    } catch {
      return null;
    }
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [repuestos, setRepuestos] = useState<Repuesto[]>(repuestosIniciales);
  const [herramientas, setHerramientas] = useState<Herramienta[]>(herramientasIniciales);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>(movimientosIniciales);
  const [vistaActual, setVistaActual] = useState<View>("dashboard");
  const [tema, setTema] = useState<"oscuro" | "claro">(() => {
    try {
      const saved = localStorage.getItem("genesis_tema_modo");
      if (saved === "claro" || saved === "oscuro") return saved;
    } catch {}
    return "oscuro";
  });

  useEffect(() => {
    try {
      localStorage.setItem("genesis_tema_modo", tema);
      if (tema === "claro") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {}
  }, [tema]);

  const toggleTema = useCallback(() => {
    setTema((t) => (t === "oscuro" ? "claro" : "oscuro"));
  }, []);

  const [supabaseConectado, setSupabaseConectado] = useState(isSupabaseConfigured);
  const [sincronizando, setSincronizando] = useState(false);
  const [diagnostico, setDiagnostico] = useState<ConnectionDiagnostic | null>(null);

  // Configuración de WhatsApp
  const [whatsAppConfig, setWhatsAppConfigState] = useState<WhatsAppConfig>(getWhatsAppConfig);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setWhatsAppConfigState(e.detail);
      }
    };
    window.addEventListener("genesis_whatsapp_config_changed", handleConfigChange);
    return () => {
      window.removeEventListener("genesis_whatsapp_config_changed", handleConfigChange);
    };
  }, []);

  const actualizarWhatsAppConfig = (nuevaConfig: WhatsAppConfig) => {
    saveWhatsAppConfig(nuevaConfig);
    setWhatsAppConfigState(nuevaConfig);
  };

  const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Función para sincronizar datos directamente desde Supabase
  const sincronizarConSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setSincronizando(true);

    try {
      const [dbReps, dbMovs, dbHerrs, dbUsers] = await Promise.allSettled([
        dbFetchRepuestos(),
        dbFetchMovimientos(),
        dbFetchHerramientas(),
        dbFetchUsuarios(),
      ]);

      if (dbReps.status === "fulfilled") {
        setRepuestos(dbReps.value);
      }
      if (dbMovs.status === "fulfilled") {
        setMovimientos(dbMovs.value);
      }
      if (dbHerrs.status === "fulfilled") {
        setHerramientas(dbHerrs.value);
      }
      if (dbUsers.status === "fulfilled") {
        // Purga preventiva en Supabase para asegurar borrado físico de Ana (id: 2) y Roberto (id: 3)
        try {
          await supabase.from("movimientos_kardex").update({ usuario_id: null }).in("usuario_id", [2, 3]);
          await supabase.from("usuarios").delete().in("id", [2, 3]);
          await supabase.from("usuarios").delete().eq("activo", false);
        } catch {
          // Ignorar si ya fueron eliminados
        }

        const usuariosFiltrados = dbUsers.value.filter(
          (u) => u.activo || u.rol === "gerente"
        );
        setUsuarios(usuariosFiltrados.length > 0 ? usuariosFiltrados : usuariosIniciales);
      }

      setSupabaseConectado(true);
    } catch (err) {
      console.warn("No se pudo sincronizar con Supabase, usando respaldo en memoria:", err);
    } finally {
      setSincronizando(false);
    }
  }, []);

  // Diagnóstico de Conexión
  const probarConexion = useCallback(async (): Promise<ConnectionDiagnostic> => {
    setSincronizando(true);
    try {
      const diag = await dbProbarConexion();
      setDiagnostico(diag);
      setSupabaseConectado(diag.ok);
      return diag;
    } finally {
      setSincronizando(false);
    }
  }, []);

  // Sembrar datos iniciales si Supabase está vacío
  const sembrarDatosSupabase = useCallback(async () => {
    setSincronizando(true);
    try {
      const res = await dbSembrarDatosIniciales();
      if (res.ok) {
        await sincronizarConSupabase();
      }
      return res;
    } finally {
      setSincronizando(false);
    }
  }, [sincronizarConSupabase]);

  // Carga inicial al montar el componente
  useEffect(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignorar si el almacenamiento está restringido
    }

    if (isSupabaseConfigured && supabase) {
      sincronizarConSupabase();
      probarConexion();
    }
  }, [sincronizarConSupabase, probarConexion]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const res = await dbLoginUsuario(email, password);
      if (res.ok && res.usuario) {
        setUsuarioActual(res.usuario);
        try {
          sessionStorage.setItem("usuario_genesis_sesion", JSON.stringify(res.usuario));
        } catch {
          // Ignorar
        }
        setVistaActual("dashboard");
        return { ok: true };
      }
      return { ok: false, error: res.error || "Credenciales incorrectas o usuario inactivo." };
    }

    // Fallback offline (sólo en memoria / sessionStorage de la pestaña)
    const u = usuarios.find(
      (x) =>
        x.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        x.password === password &&
        x.activo
    );
    if (u) {
      setUsuarioActual(u);
      try {
        sessionStorage.setItem("usuario_genesis_sesion", JSON.stringify(u));
      } catch {
        // Ignorar
      }
      setVistaActual("dashboard");
      return { ok: true };
    }
    return { ok: false, error: "Credenciales incorrectas o usuario inactivo." };
  };

  const logout = () => {
    setUsuarioActual(null);
    setVistaActual("dashboard");
    try {
      sessionStorage.removeItem("usuario_genesis_sesion");
      localStorage.clear();
    } catch {
      // Ignorar
    }
  };

  const setVista = (v: View) => setVistaActual(v);

  // Repuestos: Crear, Editar, Eliminar con soporte Supabase + local
  const agregarRepuesto = async (r: Omit<Repuesto, "id">) => {
    const localId = uid();
    const nuevoRepuesto: Repuesto = { ...r, id: localId };
    setRepuestos((prev) => [nuevoRepuesto, ...prev]);

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const dbId = await dbCrearRepuesto(r);
        if (dbId) {
          setRepuestos((prev) =>
            prev.map((item) => (item.id === localId ? { ...item, id: dbId } : item))
          );
        }
      } finally {
        setSincronizando(false);
      }
    }
  };

  const editarRepuesto = async (r: Repuesto) => {
    const anterior = repuestos.find((x) => x.id === r.id);
    if (
      whatsAppConfig.activo &&
      anterior &&
      anterior.existencia > 0 &&
      r.existencia <= 0
    ) {
      enviarAlertaStockCero({
        repuestoNombre: r.nombre,
        repuestoCodigo: r.codigo,
        sucursal: r.sucursal,
        cantidadSalida: anterior.existencia - r.existencia,
        stockAnterior: anterior.existencia,
        stockResultante: r.existencia,
        motivo: "Ajuste directo de stock a 0",
        usuarioNombre: usuarioActual?.nombre || "Sistema",
        fecha: new Date().toLocaleString(),
      }).catch((e) => console.warn("Error enviando alerta WhatsApp en edición:", e));
    }

    setRepuestos((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const ok = await dbActualizarRepuesto(r);
        if (!ok) {
          await sincronizarConSupabase();
        }
      } finally {
        setSincronizando(false);
      }
    }
  };

  const eliminarRepuesto = async (id: string) => {
    const prevReps = [...repuestos];
    setRepuestos((prev) => prev.filter((x) => x.id !== id));
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const ok = await dbEliminarRepuesto(id);
        if (!ok) {
          setRepuestos(prevReps);
        }
      } finally {
        setSincronizando(false);
      }
    }
  };

  // Movimientos Kardex
  const registrarMovimiento = async ({
    repuestoId,
    tipo,
    cantidad,
    motivo,
    folioReferencia,
    notas,
  }: {
    repuestoId: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    folioReferencia?: string;
    notas?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!usuarioActual) return { ok: false, error: "No hay usuario autenticado." };
    if (cantidad <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };

    const rep = repuestos.find((r) => r.id === repuestoId);
    if (!rep) return { ok: false, error: "Repuesto no encontrado." };

    if (tipo === "salida" && rep.existencia < cantidad) {
      return {
        ok: false,
        error: `Existencia insuficiente. Stock disponible: ${rep.existencia}`,
      };
    }

    const stockAnterior = rep.existencia;
    const nuevoStock =
      tipo === "entrada"
        ? stockAnterior + cantidad
        : tipo === "salida"
          ? stockAnterior - cantidad
          : cantidad;

    // Actualizar repuesto localmente
    setRepuestos((prev) =>
      prev.map((r) =>
        r.id === repuestoId
          ? {
            ...r,
            existencia: nuevoStock,
            fechaUltimaCompra:
              tipo === "entrada"
                ? new Date().toISOString().split("T")[0]
                : r.fechaUltimaCompra,
          }
          : r
      )
    );

    const ahora = new Date();
    const fechaStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")} ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

    const nuevoMovimiento: MovimientoInventario = {
      id: uid(),
      repuestoId: rep.id,
      repuestoNombre: rep.nombre,
      repuestoCodigo: rep.codigo,
      sucursal: rep.sucursal,
      tipo,
      cantidad,
      stockAnterior,
      stockResultante: nuevoStock,
      motivo,
      folioReferencia: folioReferencia?.trim() || undefined,
      fecha: fechaStr,
      usuarioId: usuarioActual.id,
      usuarioNombre: usuarioActual.nombre,
      notas: notas?.trim() || undefined,
    };

    setMovimientos((prev) => [nuevoMovimiento, ...prev]);

    if (isSupabaseConfigured && supabase) {
      dbRegistrarMovimiento({
        repuestoId: rep.id,
        repuestoNombre: rep.nombre,
        repuestoCodigo: rep.codigo,
        sucursal: rep.sucursal,
        tipo,
        cantidad,
        stockAnterior,
        stockResultante: nuevoStock,
        motivo,
        folioReferencia,
        usuarioId: usuarioActual.id,
        usuarioNombre: usuarioActual.nombre,
        notas,
      }).catch((e) => console.error("Error al persistir en Supabase:", e));
    }

    // Alerta automática a WhatsApp cuando el producto se agota (stock llega a 0)
    if (whatsAppConfig.activo && stockAnterior > 0 && nuevoStock <= 0) {
      enviarAlertaStockCero({
        repuestoNombre: rep.nombre,
        repuestoCodigo: rep.codigo,
        sucursal: rep.sucursal,
        cantidadSalida: cantidad,
        stockAnterior,
        stockResultante: nuevoStock,
        motivo,
        folioReferencia,
        usuarioNombre: usuarioActual.nombre,
        fecha: fechaStr,
      }).catch((err) => console.warn("Error enviando alerta WhatsApp al agotar stock:", err));
    } else if (
      whatsAppConfig.activo &&
      whatsAppConfig.notificarStockMinimo &&
      stockAnterior > rep.stockMinimo &&
      nuevoStock <= rep.stockMinimo &&
      nuevoStock > 0
    ) {
      enviarAlertaStockCero({
        repuestoNombre: `${rep.nombre} (Stock Mínimo Alcanzado)`,
        repuestoCodigo: rep.codigo,
        sucursal: rep.sucursal,
        cantidadSalida: cantidad,
        stockAnterior,
        stockResultante: nuevoStock,
        motivo: `Umbral de seguridad alcanzado (${rep.stockMinimo} u.) - ${motivo}`,
        folioReferencia,
        usuarioNombre: usuarioActual.nombre,
        fecha: fechaStr,
      }).catch((err) => console.warn("Error enviando alerta WhatsApp de stock mínimo:", err));
    }

    return { ok: true };
  };

  // Herramientas
  const agregarHerramienta = async (h: Omit<Herramienta, "id">) => {
    const localId = uid();
    setHerramientas((prev) => [...prev, { ...h, id: localId }]);
    if (isSupabaseConfigured && supabase) {
      const dbId = await dbCrearHerramienta(h);
      if (dbId) {
        setHerramientas((prev) =>
          prev.map((x) => (x.id === localId ? { ...x, id: dbId } : x))
        );
      }
    }
  };

  const editarHerramienta = async (h: Herramienta) => {
    setHerramientas((prev) => prev.map((x) => (x.id === h.id ? h : x)));
    if (isSupabaseConfigured && supabase) {
      await dbActualizarHerramienta(h);
    }
  };

  const eliminarHerramienta = async (id: string) => {
    setHerramientas((prev) => prev.filter((x) => x.id !== id));
    if (isSupabaseConfigured && supabase) {
      await dbEliminarHerramienta(id);
    }
  };

  // Usuarios
  const agregarUsuario = async (u: Omit<Usuario, "id">) => {
    const localId = uid();
    setUsuarios((prev) => [...prev, { ...u, id: localId }]);
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const dbId = await dbCrearUsuario(u);
        if (dbId) {
          setUsuarios((prev) =>
            prev.map((x) => (x.id === localId ? { ...x, id: dbId } : x))
          );
        } else {
          console.error("dbCrearUsuario devolvió null — revisar consola de Supabase");
        }
      } catch (e) {
        console.error("Error al crear usuario en Supabase:", e);
      } finally {
        setSincronizando(false);
      }
    }
  };

  const editarUsuario = async (u: Usuario) => {
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        await dbActualizarUsuario(u);
      } catch (e) {
        console.error("Error al actualizar usuario en Supabase:", e);
      } finally {
        setSincronizando(false);
      }
    }
  };

  const toggleUsuario = async (id: string) => {
    let nuevoEstado = false;
    setUsuarios((prev) => {
      const updated = prev.map((x) => {
        if (x.id === id) {
          nuevoEstado = !x.activo;
          return { ...x, activo: nuevoEstado };
        }
        return x;
      });
      return updated;
    });
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        await dbToggleUsuario(id, nuevoEstado);
      } catch (e) {
        console.error("Error al cambiar estado de usuario en Supabase:", e);
      } finally {
        setSincronizando(false);
      }
    }
  };

  const eliminarUsuario = async (id: string) => {
    const targetUser = usuarios.find((u) => u.id === id);
    setUsuarios((prev) => prev.filter((x) => x.id !== id));

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        await dbEliminarUsuario(id, targetUser?.email);
      } catch (e) {
        console.error("Error al eliminar usuario en Supabase:", e);
      } finally {
        setSincronizando(false);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        usuarioActual,
        usuarios,
        repuestos,
        herramientas,
        movimientos,
        vistaActual,
        tema,
        toggleTema,
        supabaseConectado,
        sincronizando,
        diagnostico,
        probarConexion,
        sembrarDatosSupabase,
        sincronizarConSupabase,
        login,
        logout,
        setVista,
        agregarRepuesto,
        editarRepuesto,
        eliminarRepuesto,
        registrarMovimiento,
        agregarHerramienta,
        editarHerramienta,
        eliminarHerramienta,
        agregarUsuario,
        editarUsuario,
        toggleUsuario,
        eliminarUsuario,
        whatsAppConfig,
        actualizarWhatsAppConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
