import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type {
  Usuario,
  Repuesto,
  Herramienta,
  MovimientoInventario,
  TipoMovimiento,
  WhatsAppConfig,
  PasswordRecoveryResult,
} from "./types";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  enviarAlertaStockCero,
} from "./lib/whatsappService";
import {
  enviarCorreoRecuperacion,
  limpiarCredencialesCorreoDelNavegador,
} from "./lib/emailService";

import {
  usuariosIniciales,
  repuestosIniciales,
  herramientasIniciales,
  movimientosIniciales,
} from "./data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  enqueueOfflineChange,
  loadOfflineChanges,
  loadOfflineSnapshot,
  remapOfflineEntityId,
  removeOfflineChange,
  saveOfflineSnapshot,
  type OfflineChange,
} from "./lib/offlineStorage";
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
  dbFetchUsuarioAutenticado,
  dbSolicitarRecuperacionPassword,
  dbCambiarPasswordUsuario,
  type ConnectionDiagnostic,
} from "./lib/supabaseService";

type OfflineChangeDraft = OfflineChange extends infer Change
  ? Change extends OfflineChange
    ? Omit<Change, "id" | "userId">
    : never
  : never;

let offlineChangeSequence = 0;

export type View =
  | "dashboard"
  | "inventario"
  | "movimientos"
  | "herramientas"
  | "reportes"
  | "usuarios"
  | "respaldo"
  | "ayuda";

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
  enLinea: boolean;
  cambiosPendientes: number;
  errorSincronizacion: string | null;
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
  agregarUsuario: (u: Omit<Usuario, "id">) => Promise<{ ok: boolean; error?: string }>;
  editarUsuario: (u: Usuario) => Promise<void>;
  toggleUsuario: (id: string) => Promise<void>;
  eliminarUsuario: (id: string) => Promise<void>;
  whatsAppConfig: WhatsAppConfig;
  actualizarWhatsAppConfig: (config: WhatsAppConfig) => void;
  debeCambiarPassword: boolean;
  setDebeCambiarPassword: (debe: boolean) => void;
  solicitarRecuperacionPassword: (email: string) => Promise<PasswordRecoveryResult>;
  cambiarMiPassword: (nuevaPassword: string, conservarRecuperacion?: boolean) => Promise<{ ok: boolean; error?: string }>;
}

// Helpers para rastreo de contraseñas temporales activas
const TEMP_USERS_STORAGE_KEY = "GENESIS_TEMP_USERS";

function marcarUsuarioConPassTemporal(email: string) {
  try {
    const raw = localStorage.getItem(TEMP_USERS_STORAGE_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    const clean = email.trim().toLowerCase();
    if (!set.includes(clean)) {
      set.push(clean);
      localStorage.setItem(TEMP_USERS_STORAGE_KEY, JSON.stringify(set));
    }
  } catch {
    // Ignorar
  }
}

function esUsuarioConPassTemporal(email: string): boolean {
  try {
    const raw = localStorage.getItem(TEMP_USERS_STORAGE_KEY);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    return set.includes(email.trim().toLowerCase());
  } catch {
    return false;
  }
}

function desmarcarUsuarioConPassTemporal(email: string) {
  try {
    const raw = localStorage.getItem(TEMP_USERS_STORAGE_KEY);
    if (!raw) return;
    const set: string[] = JSON.parse(raw);
    const clean = email.trim().toLowerCase();
    const filtrado = set.filter((x) => x !== clean);
    localStorage.setItem(TEMP_USERS_STORAGE_KEY, JSON.stringify(filtrado));
  } catch {
    // Ignorar
  }
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);
  const [repuestos, setRepuestos] = useState<Repuesto[]>(isSupabaseConfigured ? [] : repuestosIniciales);
  const [herramientas, setHerramientas] = useState<Herramienta[]>(isSupabaseConfigured ? [] : herramientasIniciales);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>(isSupabaseConfigured ? [] : movimientosIniciales);
  const [vistaActual, setVistaActual] = useState<View>("dashboard");
  const [tema, setTema] = useState<"oscuro" | "claro">(() => {
    try {
      const saved = localStorage.getItem("genesis_tema_modo");
      if (saved === "claro" || saved === "oscuro") return saved;
    } catch { }
    return "oscuro";
  });

  useEffect(() => {
    limpiarCredencialesCorreoDelNavegador();
    getWhatsAppConfig();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.removeItem("usuario_genesis_sesion");
      localStorage.removeItem("usuario_genesis_sesion");
    } catch (error) {
      console.warn("No se pudo limpiar la sesión antigua del navegador:", error);
    }
    document.cookie =
      "usuario_genesis_sesion=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict;";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("genesis_tema_modo", tema);
      if (tema === "claro") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch { }
  }, [tema]);

  const toggleTema = useCallback(() => {
    setTema((t) => (t === "oscuro" ? "claro" : "oscuro"));
  }, []);

  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  const [cambiosPendientes, setCambiosPendientes] = useState(0);
  const [errorSincronizacion, setErrorSincronizacion] = useState<string | null>(null);
  const [respaldoListoParaUsuario, setRespaldoListoParaUsuario] = useState<string | null>(null);
  const [supabaseConectado, setSupabaseConectado] = useState(isSupabaseConfigured && navigator.onLine);
  const [sincronizando, setSincronizando] = useState(false);
  const [diagnostico, setDiagnostico] = useState<ConnectionDiagnostic | null>(null);
  const sincronizacionActiva = useRef(false);
  const sincronizacionSolicitada = useRef(false);
  const usuarioIdActual = useRef<string | null>(null);

  useEffect(() => {
    usuarioIdActual.current = usuarioActual?.id ?? null;
  }, [usuarioActual?.id]);

  useEffect(() => {
    if (!usuarioActual) {
      setCambiosPendientes(0);
      setRespaldoListoParaUsuario(null);
      return;
    }
    setRespaldoListoParaUsuario(null);
    let activo = true;
    void Promise.all([
      loadOfflineSnapshot(usuarioActual.id),
      loadOfflineChanges(usuarioActual.id),
    ]).then(([snapshot, changes]) => {
      if (!activo) return;
      if (snapshot && !navigator.onLine) {
        setRepuestos(snapshot.repuestos);
        setHerramientas(snapshot.herramientas);
        setMovimientos(snapshot.movimientos);
      }
      setCambiosPendientes(changes.length);
      if (!navigator.onLine) setRespaldoListoParaUsuario(usuarioActual.id);
    }).catch((error: unknown) => {
      console.error("No se pudieron recuperar los datos pendientes sin conexión:", error);
    });
    return () => {
      activo = false;
    };
  }, [usuarioActual?.id]);

  useEffect(() => {
    if (!usuarioActual || respaldoListoParaUsuario !== usuarioActual.id) return;
    void saveOfflineSnapshot(usuarioActual.id, { repuestos, herramientas, movimientos })
      .catch((error: unknown) => {
        console.error("No se pudo guardar el respaldo local del inventario:", error);
      });
  }, [usuarioActual?.id, respaldoListoParaUsuario, repuestos, herramientas, movimientos]);

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

  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false);

  const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Sincroniza el respaldo local y aplica los cambios pendientes en orden.
  const sincronizarConSupabase = useCallback(async (requestedUserId = usuarioIdActual.current) => {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine || !requestedUserId) return;
    if (sincronizacionActiva.current) {
      sincronizacionSolicitada.current = true;
      return;
    }
    sincronizacionActiva.current = true;
    sincronizacionSolicitada.current = false;
    setSincronizando(true);
    setErrorSincronizacion(null);

    try {
      const [dbReps, dbMovs, dbHerrs, dbUsers] = await Promise.allSettled([
        dbFetchRepuestos(),
        dbFetchMovimientos(),
        dbFetchHerramientas(),
        dbFetchUsuarios(),
      ]);

      if (dbReps.status !== "fulfilled") {
        console.error("No se pudo actualizar el inventario desde Supabase:", dbReps.reason);
        setErrorSincronizacion("No se pudo conectar con Supabase. Los cambios siguen guardados en este dispositivo.");
        setSupabaseConectado(false);
        return;
      }
      if (dbUsers.status === "fulfilled") {
        const usuariosFiltrados = dbUsers.value.filter(
          (u) => u.activo || u.rol === "gerente"
        );
        setUsuarios(usuariosFiltrados);
      } else {
        console.error("No se pudieron cargar los usuarios desde Supabase:", dbUsers.reason);
      }

      const pending = await loadOfflineChanges(requestedUserId);
      const projectedRepuestos = [...dbReps.value];
      const projectedHerramientas = dbHerrs.status === "fulfilled" ? [...dbHerrs.value] : [];
      const projectedMovimientos = dbMovs.status === "fulfilled" ? [...dbMovs.value] : [];
      const projectedStock = new Map(projectedRepuestos.map((repuesto) => [repuesto.id, repuesto.existencia]));
      for (const change of pending) {
        switch (change.type) {
          case "create-part":
            projectedRepuestos.unshift({ ...change.value.part, id: change.value.localId });
            projectedStock.set(change.value.localId, change.value.part.existencia);
            break;
          case "update-part": {
            const index = projectedRepuestos.findIndex((item) => item.id === change.value.id);
            if (index >= 0) projectedRepuestos[index] = change.value;
            projectedStock.set(change.value.id, change.value.existencia);
            break;
          }
          case "delete-part":
            for (let index = projectedRepuestos.length - 1; index >= 0; index--) {
              if (projectedRepuestos[index].id === change.value.id) projectedRepuestos.splice(index, 1);
            }
            projectedStock.delete(change.value.id);
            break;
          case "movement": {
            const repuesto = projectedRepuestos.find((item) => item.id === change.value.repuestoId);
            const stockAnterior = projectedStock.get(change.value.repuestoId) ?? change.value.stockAnterior;
            const stockResultante = change.value.tipo === "entrada"
              ? stockAnterior + change.value.cantidad
              : change.value.tipo === "salida"
                ? stockAnterior - change.value.cantidad
                : change.value.cantidad;
            if (repuesto) {
              repuesto.existencia = stockResultante;
              projectedStock.set(repuesto.id, stockResultante);
            }
            projectedMovimientos.unshift({
              id: change.id,
              repuestoId: change.value.repuestoId,
              repuestoNombre: change.value.repuestoNombre,
              repuestoCodigo: change.value.repuestoCodigo,
              sucursal: change.value.sucursal,
              tipo: change.value.tipo,
              cantidad: change.value.cantidad,
              stockAnterior,
              stockResultante,
              motivo: change.value.motivo,
              folioReferencia: change.value.folioReferencia,
              fecha: new Date(Number(change.id.slice(0, 13))).toLocaleString(),
              usuarioId: change.value.usuarioId,
              usuarioNombre: change.value.usuarioNombre,
              notas: change.value.notas,
            });
            break;
          }
          case "create-tool":
            projectedHerramientas.push({ ...change.value.tool, id: change.value.localId });
            break;
          case "update-tool": {
            const index = projectedHerramientas.findIndex((item) => item.id === change.value.id);
            if (index >= 0) projectedHerramientas[index] = change.value;
            break;
          }
          case "delete-tool":
            for (let index = projectedHerramientas.length - 1; index >= 0; index--) {
              if (projectedHerramientas[index].id === change.value.id) projectedHerramientas.splice(index, 1);
            }
            break;
        }
      }
      setRepuestos(projectedRepuestos);
      setHerramientas(projectedHerramientas);
      setMovimientos(projectedMovimientos);
      setRespaldoListoParaUsuario(requestedUserId);
      const idMap = new Map<string, string>();
      const existenciaActual = new Map(dbReps.value.map((repuesto) => [repuesto.id, repuesto.existencia]));
      for (const change of pending) {
        if (!navigator.onLine) break;
        let aplicado = false;
        try {
          switch (change.type) {
            case "create-part": {
              const id = await dbCrearRepuesto(change.value.part);
              if (id) {
                idMap.set(change.value.localId, id);
                await remapOfflineEntityId(requestedUserId, change.value.localId, id);
                existenciaActual.set(id, change.value.part.existencia);
                setRepuestos((current) => current.map((item) =>
                  item.id === change.value.localId ? { ...item, id } : item
                ));
                aplicado = true;
              }
              break;
            }
            case "update-part": {
              const id = idMap.get(change.value.id) ?? change.value.id;
              aplicado = await dbActualizarRepuesto({ ...change.value, id });
              if (aplicado) existenciaActual.set(id, change.value.existencia);
              break;
            }
            case "delete-part": {
              const id = idMap.get(change.value.id) ?? change.value.id;
              aplicado = await dbEliminarRepuesto(id);
              if (aplicado) existenciaActual.delete(id);
              break;
            }
            case "movement": {
              const repuestoId = idMap.get(change.value.repuestoId) ?? change.value.repuestoId;
              const stockAnterior = existenciaActual.get(repuestoId) ?? change.value.stockAnterior;
              const stockResultante = change.value.tipo === "entrada"
                ? stockAnterior + change.value.cantidad
                : change.value.tipo === "salida"
                  ? stockAnterior - change.value.cantidad
                  : change.value.cantidad;
              if (change.value.tipo === "salida" && stockResultante < 0) {
                console.error("No se pudo sincronizar un movimiento: el stock actual es insuficiente.", change);
                break;
              }
              aplicado = await dbRegistrarMovimiento({
                ...change.value,
                repuestoId,
                stockAnterior,
                stockResultante,
              });
              if (aplicado) existenciaActual.set(repuestoId, stockResultante);
              break;
            }
            case "create-tool": {
              const id = await dbCrearHerramienta(change.value.tool);
              if (id) {
                idMap.set(change.value.localId, id);
                await remapOfflineEntityId(requestedUserId, change.value.localId, id);
                setHerramientas((current) => current.map((item) =>
                  item.id === change.value.localId ? { ...item, id } : item
                ));
                aplicado = true;
              }
              break;
            }
            case "update-tool": {
              const id = idMap.get(change.value.id) ?? change.value.id;
              aplicado = await dbActualizarHerramienta({ ...change.value, id });
              break;
            }
            case "delete-tool": {
              const id = idMap.get(change.value.id) ?? change.value.id;
              aplicado = await dbEliminarHerramienta(id);
              break;
            }
          }
        } catch (error) {
          console.error("Error al sincronizar un cambio pendiente; se conservará para reintentar:", error);
        }
        if (!aplicado) {
          setErrorSincronizacion("Hay cambios sin sincronizar. Verifica permisos, existencias y conexión; los cambios siguen guardados en este dispositivo.");
          break;
        }
        await removeOfflineChange(change.id);
      }

      const remaining = await loadOfflineChanges(requestedUserId);
      setCambiosPendientes(remaining.length);
      if (pending.length > 0 && remaining.length === 0) {
        const [freshReps, freshMovs, freshTools] = await Promise.allSettled([
          dbFetchRepuestos(),
          dbFetchMovimientos(),
          dbFetchHerramientas(),
        ]);
        if (freshReps.status === "fulfilled") setRepuestos(freshReps.value);
        if (freshMovs.status === "fulfilled") setMovimientos(freshMovs.value);
        if (freshTools.status === "fulfilled") setHerramientas(freshTools.value);
        setRespaldoListoParaUsuario(requestedUserId);
      }
      setSupabaseConectado(navigator.onLine);
    } catch (err) {
      console.error("No se pudo completar la sincronización con Supabase:", err);
      setErrorSincronizacion("No se pudo sincronizar. Los cambios siguen guardados en este dispositivo.");
      setSupabaseConectado(false);
    } finally {
      sincronizacionActiva.current = false;
      setSincronizando(false);
      if (
        sincronizacionSolicitada.current &&
        navigator.onLine &&
        usuarioIdActual.current === requestedUserId
      ) {
        sincronizacionSolicitada.current = false;
        queueMicrotask(() => void sincronizarConSupabase(requestedUserId));
      }
    }
  }, []);

  useEffect(() => {
    const actualizarConexion = () => {
      const online = navigator.onLine;
      setEnLinea(online);
      if (!online) setSupabaseConectado(false);
      if (online && usuarioActual) void sincronizarConSupabase(usuarioActual.id);
    };
    window.addEventListener("online", actualizarConexion);
    window.addEventListener("offline", actualizarConexion);
    return () => {
      window.removeEventListener("online", actualizarConexion);
      window.removeEventListener("offline", actualizarConexion);
    };
  }, [sincronizarConSupabase, usuarioActual?.id]);

  const guardarCambioPendiente = async (change: OfflineChangeDraft) => {
    if (!usuarioActual) throw new Error("Inicia sesión para guardar cambios del inventario.");
    if (!isSupabaseConfigured || !supabase) return;
    const pendingChange: OfflineChange = {
      ...change,
      id: `${String(Date.now()).padStart(13, "0")}_${String(++offlineChangeSequence).padStart(6, "0")}_${Math.random().toString(36).slice(2)}`,
      userId: usuarioActual.id,
    };
    await enqueueOfflineChange(pendingChange);
    setCambiosPendientes((count) => count + 1);
    if (navigator.onLine) void sincronizarConSupabase(usuarioActual.id);
  };

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

  // Carga inicial al montar el componente y escucha de recuperación de contraseña
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const client = supabase;
    let activo = true;
    let solicitud = 0;
    const cargarPerfilAutenticado = async (esRecuperacion = false) => {
      const idSolicitud = ++solicitud;
      try {
        const usuario = await dbFetchUsuarioAutenticado();
        if (!activo || idSolicitud !== solicitud) return;

        setUsuarioActual(usuario);
        setDebeCambiarPassword(esRecuperacion || Boolean(usuario?.passwordTemporal));
        if (usuario) {
          void sincronizarConSupabase(usuario.id);
          void probarConexion();
        } else {
          const { error } = await client.auth.signOut();
          if (error) console.error("No se pudo cerrar una sesión sin perfil activo:", error);
        }
      } catch (error) {
        if (!activo || idSolicitud !== solicitud) return;
        console.error("No se pudo validar el perfil de la sesión:", error);
        setUsuarioActual(null);
      }
    };

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      const esRecuperacion =
        event === "PASSWORD_RECOVERY" ||
        (typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") ||
            window.location.search.includes("type=recovery")));

      if (!session) {
        solicitud += 1;
        setUsuarioActual(null);
        setDebeCambiarPassword(false);
        return;
      }

      if (esRecuperacion) setDebeCambiarPassword(true);
      queueMicrotask(() => {
        void cargarPerfilAutenticado(esRecuperacion);
      });
    });

    void cargarPerfilAutenticado(
      typeof window !== "undefined" &&
        (window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery"))
    );

    return () => {
      activo = false;
      authListener.subscription.unsubscribe();
    };
  }, [probarConexion, sincronizarConSupabase]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      const res = await dbLoginUsuario(email, password);
      if (res.ok && res.usuario) {
        const esTemporal = Boolean(res.usuario.passwordTemporal);
        const usuarioConTemporal: Usuario = {
          ...res.usuario,
          passwordTemporal: esTemporal,
        };
        setUsuarioActual(usuarioConTemporal);
        if (esTemporal) {
          setDebeCambiarPassword(true);
        }
        setVistaActual("dashboard");
        void sincronizarConSupabase(res.usuario.id);
        return { ok: true };
      }
      return { ok: false, error: res.error || "Credenciales incorrectas o usuario inactivo." };
    }

    // Fallback local sin persistir la identidad ni el rol en el navegador.
    const u = usuarios.find(
      (x) =>
        x.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        x.password === password &&
        x.activo
    );
    if (u) {
      const esTemporal = Boolean(u.passwordTemporal) || esUsuarioConPassTemporal(email);
      const usuarioConTemporal: Usuario = {
        ...u,
        passwordTemporal: esTemporal,
      };
      setUsuarioActual(usuarioConTemporal);
      if (esTemporal) {
        setDebeCambiarPassword(true);
      }
      setVistaActual("dashboard");
      return { ok: true };
    }
    return { ok: false, error: "Credenciales incorrectas o usuario inactivo." };
  };

  const logout = () => {
    setUsuarioActual(null);
    setDebeCambiarPassword(false);
    setVistaActual("dashboard");
    if (isSupabaseConfigured && supabase) {
      void supabase.auth.signOut().then(({ error }) => {
        if (error) console.error("No se pudo cerrar la sesión de Supabase:", error);
      });
    }
  };

  const solicitarRecuperacionPassword = async (
    email: string
  ): Promise<PasswordRecoveryResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { ok: false, error: "Ingresa un correo electrónico válido." };
    }

    let nombreUsuario = "Empleado";

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const resDb = await dbSolicitarRecuperacionPassword(cleanEmail);
        if (!resDb.ok) {
          return { ok: false, error: resDb.error || "No se pudo generar la recuperación." };
        }

        return {
          ok: true,
          emailEnviado: Boolean(resDb.authResent),
          proveedor: resDb.authResent ? "supabase-auth" : "supabase-auth-failed",
          destinatario: cleanEmail,
          mensaje: resDb.authResent
            ? "Se envió la recuperación por Supabase Auth. Revisa tu correo registrado."
            : "La recuperación fue creada, pero no se pudo enviar el correo por Supabase Auth.",
        };
      } catch (err: any) {
        console.error("Error al procesar recuperación en Supabase:", err);
        return { ok: false, error: "Error de conexión al procesar la solicitud." };
      } finally {
        setSincronizando(false);
      }
    }

    // Fallback offline / local
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomStr = "";
    for (let i = 0; i < 6; i++) {
      randomStr += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    const passTemporal = `Tmp-${randomStr}`;

    const u = usuarios.find(
      (x) => x.email.trim().toLowerCase() === cleanEmail
    );
    if (!u) {
      return { ok: false, error: "No se encontró ningún empleado registrado con este correo electrónico." };
    }
    if (!u.activo) {
      return { ok: false, error: "La cuenta de este empleado se encuentra inactiva." };
    }

    nombreUsuario = u.nombre;
    marcarUsuarioConPassTemporal(cleanEmail);
    setUsuarios((prev) =>
      prev.map((x) =>
        x.email.trim().toLowerCase() === cleanEmail
          ? { ...x, password: passTemporal, passwordTemporal: true }
          : x
      )
    );

    const resEnvio = await enviarCorreoRecuperacion(
      cleanEmail,
      nombreUsuario,
      passTemporal
    );

    return {
      ok: true,
      emailEnviado: resEnvio.emailEnviado,
      passwordTemporal: passTemporal,
      proveedor: resEnvio.proveedor,
      destinatario: cleanEmail,
      mensaje: resEnvio.mensaje,
    };
  };

  const cambiarMiPassword = async (
    nuevaPassword: string,
    conservarRecuperacion = false
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!nuevaPassword.trim() || nuevaPassword.length < 6) {
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    let usuarioEmail = usuarioActual?.email;
    if (!usuarioEmail && isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email) {
        return { ok: false, error: "El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo." };
      }
      usuarioEmail = data.user.email;
    }
    if (!usuarioEmail) {
      return { ok: false, error: "No hay una sesión válida para restablecer la contraseña." };
    }

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const resDb = await dbCambiarPasswordUsuario(nuevaPassword, usuarioEmail);
        if (!resDb.ok) {
          return { ok: false, error: resDb.error || "No se pudo actualizar la contraseña." };
        }
      } catch (e: any) {
        console.error("Error cambiando contraseña en Supabase:", e);
        return { ok: false, error: "Error de conexión al actualizar la contraseña." };
      } finally {
        setSincronizando(false);
      }
    }

    // Actualizar usuario actual y lista local
    if (!isSupabaseConfigured) desmarcarUsuarioConPassTemporal(usuarioEmail);
    if (usuarioActual) {
      const usuarioActualizado: Usuario = {
        ...usuarioActual,
        password: isSupabaseConfigured ? "" : nuevaPassword,
        passwordTemporal: false,
      };
      setUsuarioActual(usuarioActualizado);

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioActual.id || u.email.trim().toLowerCase() === usuarioActual.email.trim().toLowerCase()
            ? usuarioActualizado
            : u
        )
      );
    }
    if (!conservarRecuperacion) setDebeCambiarPassword(false);

    return { ok: true };
  };

  const setVista = (v: View) => setVistaActual(v);

  // Repuestos: Crear, Editar, Eliminar con soporte Supabase + local
  const agregarRepuesto = async (r: Omit<Repuesto, "id">) => {
    const localId = uid();
    const nuevoRepuesto: Repuesto = { ...r, id: localId };
    await guardarCambioPendiente({
      type: "create-part",
      value: { localId, part: r },
    });
    setRepuestos((prev) => [nuevoRepuesto, ...prev]);
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

    await guardarCambioPendiente({ type: "update-part", value: r });
    setRepuestos((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  };

  const eliminarRepuesto = async (id: string) => {
    await guardarCambioPendiente({ type: "delete-part", value: { id } });
    setRepuestos((prev) => prev.filter((x) => x.id !== id));
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

    await guardarCambioPendiente({
      type: "movement",
      value: {
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
      },
    });
    setMovimientos((prev) => [nuevoMovimiento, ...prev]);

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
    await guardarCambioPendiente({
      type: "create-tool",
      value: { localId, tool: h },
    });
    setHerramientas((prev) => [...prev, { ...h, id: localId }]);
  };

  const editarHerramienta = async (h: Herramienta) => {
    await guardarCambioPendiente({ type: "update-tool", value: h });
    setHerramientas((prev) => prev.map((x) => (x.id === h.id ? h : x)));
  };

  const eliminarHerramienta = async (id: string) => {
    await guardarCambioPendiente({ type: "delete-tool", value: { id } });
    setHerramientas((prev) => prev.filter((x) => x.id !== id));
  };

  // Usuarios
  const agregarUsuario = async (
    u: Omit<Usuario, "id">
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const result = await dbCrearUsuario(u);
        if (!result.id) {
          return { ok: false, error: result.error || "No se pudo crear el usuario." };
        }
        setUsuarios((prev) => [...prev, { ...u, id: result.id!, password: "" }]);
        return { ok: true };
      } catch (e) {
        console.error("Error al crear usuario en Supabase:", e);
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Error de conexión al crear el usuario.",
        };
      } finally {
        setSincronizando(false);
      }
    }
    setUsuarios((prev) => [...prev, { ...u, id: uid() }]);
    return { ok: true };
  };

  const editarUsuario = async (u: Usuario) => {
    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const actualizado = await dbActualizarUsuario(u);
        if (!actualizado) {
          throw new Error("Supabase rechazó la modificación. Verifica que tu cuenta tenga permisos de gerente.");
        }
      } catch (e) {
        console.error("Error al actualizar usuario en Supabase:", e);
        throw e;
      } finally {
        setSincronizando(false);
      }
    }
    setUsuarios((prev) =>
      prev.map((x) =>
        x.id === u.id ? { ...u, password: isSupabaseConfigured ? "" : u.password } : x
      )
    );
  };

  const toggleUsuario = async (id: string) => {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) throw new Error("No se encontró el usuario que intentas actualizar.");
    const nuevoEstado = !usuario.activo;

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const actualizado = await dbToggleUsuario(id, nuevoEstado);
        if (!actualizado) {
          throw new Error("Supabase rechazó el cambio. Verifica que tu cuenta tenga permisos de gerente.");
        }
      } catch (e) {
        console.error("Error al cambiar estado de usuario en Supabase:", e);
        throw e;
      } finally {
        setSincronizando(false);
      }
    }

    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: nuevoEstado } : u))
    );
  };

  const eliminarUsuario = async (id: string) => {
    const targetUser = usuarios.find((u) => u.id === id);
    if (!targetUser) throw new Error("No se encontró el usuario que intentas eliminar.");

    if (isSupabaseConfigured && supabase) {
      setSincronizando(true);
      try {
        const eliminado = await dbEliminarUsuario(id, targetUser.email);
        if (!eliminado) {
          throw new Error("Supabase rechazó la eliminación. Verifica que tu cuenta tenga permisos de gerente.");
        }
      } catch (e) {
        console.error("Error al eliminar usuario en Supabase:", e);
        throw e;
      } finally {
        setSincronizando(false);
      }
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== id));
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
        enLinea,
        cambiosPendientes,
        errorSincronizacion,
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
        debeCambiarPassword,
        setDebeCambiarPassword,
        solicitarRecuperacionPassword,
        cambiarMiPassword,
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
