import { supabase, isSupabaseConfigured } from "./supabase";
import { createClient } from "@supabase/supabase-js";
import type {
  Repuesto,
  Herramienta,
  MovimientoInventario,
  Usuario,
  Sucursal,
  CategoriaRepuesto,
  TipoMovimiento,
} from "../types";

// Conversión de IDs de sucursal Supabase (1, 2) a tipos de frontend ("sucursal1", "sucursal2")
export function mapSucursalId(id: number | string): Sucursal {
  if (id === 1 || id === "1" || id === "sucursal1") return "sucursal1";
  return "sucursal2";
}

export function unmapSucursalId(sucursal: Sucursal): number {
  return sucursal === "sucursal1" ? 1 : 2;
}

// Sanitizar patrones de búsqueda ILIKE para evitar inyección de comodines (% y _)
export function sanitizeLikePattern(pattern: string): string {
  return pattern.replace(/[%_]/g, "\\$&").trim();
}

const BACKUP_TABLES = [
  "sucursales",
  "categorias_repuestos",
  "proveedores",
  "usuarios",
  "repuestos",
  "inventario_repuestos",
  "herramientas",
  "movimientos_kardex",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];
const USER_EXPORT_COLUMNS =
  "id, auth_id, sucursal_id, nombre, email, rol, activo, password_temporal";

function sqlIdentificador(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function sqlJsonb(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function crearInsercionesRespaldo(
  table: string,
  rows: Record<string, unknown>[]
): string[] {
  if (table === "usuarios") {
    return rows.flatMap((row) => {
      const fields = Object.keys(row).filter((field) => field !== "id");
      if (row.id === undefined || fields.length === 0) return [];

      const assignments = fields
        .map((field) => `  ${sqlIdentificador(field)} = datos.${sqlIdentificador(field)}`)
        .join(",\n");

      return [
        `UPDATE public.${sqlIdentificador(table)} AS actual\n` +
          `SET\n${assignments}\n` +
          `FROM jsonb_populate_record(NULL::public.${sqlIdentificador(table)}, ${sqlJsonb(row)}) AS datos\n` +
          `WHERE actual.${sqlIdentificador("id")} = datos.${sqlIdentificador("id")};`,
      ];
    });
  }

  const statements: string[] = [];
  const chunkSize = 250;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const batch = rows.slice(index, index + chunkSize);
    statements.push(
      `INSERT INTO public.${sqlIdentificador(table)}\n` +
        `SELECT *\n` +
        `FROM jsonb_populate_recordset(NULL::public.${sqlIdentificador(table)}, ${sqlJsonb(batch)})\n` +
        `ON CONFLICT DO NOTHING;`
    );
  }

  return statements;
}

export async function dbExportarRespaldo(): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase no está configurado.");
  }

  const statements: string[] = [];
  const pageSize = 1000;

  for (const table of BACKUP_TABLES) {
    const rows: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const result = table === "usuarios"
        ? await supabase
            .from("usuarios")
            .select(USER_EXPORT_COLUMNS)
            .range(from, from + pageSize - 1)
        : await supabase
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

      if (result.error) {
        throw new Error(`No se pudo exportar la tabla ${table}: ${result.error.message}`);
      }

      const page = (result.data || []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    const safeRows = rows;
    statements.push(...crearInsercionesRespaldo(table, safeRows));
  }

  return [
    "-- Respaldo de datos de Genesis generado desde la aplicacion.",
    `-- Fecha de exportacion: ${new Date().toISOString()}`,
    "-- Inserta filas faltantes sin duplicar; no elimina datos existentes.",
    "-- Usuarios: actualiza perfiles existentes por ID; omite contrasenas.",
    "-- Requiere que el esquema y las tablas de Supabase ya existan.",
    "BEGIN;",
    ...statements,
    "COMMIT;",
    "",
  ].join("\n\n");
}

export async function dbExportarTablaCSV(table: BackupTableName): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase no está configurado.");
  }

  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const result = table === "usuarios"
      ? await supabase
          .from("usuarios")
          .select(USER_EXPORT_COLUMNS)
          .range(from, from + pageSize - 1)
      : await supabase
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);

    if (result.error) {
      throw new Error(`No se pudo exportar la tabla ${table}: ${result.error.message}`);
    }

    const page = (result.data || []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  const safeRows = rows;
  const columns = Object.keys(safeRows[0] || {});
  if (columns.length === 0) return "";

  const csvCell = (value: unknown) => {
    const text = value !== null && typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "");
    const safeText = typeof value === "string" && /^[=+@\-\t\r]/.test(text)
      ? `'${text}`
      : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };

  return [
    columns.map(csvCell).join(","),
    ...safeRows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n") + "\r\n";
}

// 0. Diagnóstico de Conexión
export interface ConnectionDiagnostic {
  ok: boolean;
  url: string;
  latencyMs: number;
  tables: Record<string, { ok: boolean; count: number; error?: string }>;
  error?: string;
}

export async function dbProbarConexion(): Promise<ConnectionDiagnostic> {
  const start = performance.now();
  const url = import.meta.env.VITE_SUPABASE_URL || "";

  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      url,
      latencyMs: 0,
      tables: {},
      error: "Credenciales de Supabase no configuradas o incompletas en el archivo .env",
    };
  }

  const tablesToCheck = [
    "sucursales",
    "categorias_repuestos",
    "proveedores",
    "repuestos",
    "inventario_repuestos",
    "movimientos_kardex",
    "herramientas",
    "usuarios",
  ];

  const tableResults: Record<string, { ok: boolean; count: number; error?: string }> = {};
  let anyError = false;

  for (const table of tablesToCheck) {
    try {
      const result = table === "usuarios"
        ? await supabase.from("usuarios").select("id", { count: "exact", head: true })
        : await supabase.from(table).select("*", { count: "exact", head: true });

      if (result.error) {
        tableResults[table] = { ok: false, count: 0, error: result.error.message };
        anyError = true;
      } else {
        tableResults[table] = { ok: true, count: result.count ?? 0 };
      }
    } catch (err: any) {
      tableResults[table] = { ok: false, count: 0, error: err?.message || "Error al consultar" };
      anyError = true;
    }
  }

  const latencyMs = Math.round(performance.now() - start);

  return {
    ok: !anyError,
    url,
    latencyMs,
    tables: tableResults,
    error: anyError ? "Algunas tablas reportaron errores de consulta." : undefined,
  };
}

// 1. Cargar Repuestos desde Supabase
export async function dbFetchRepuestos(): Promise<Repuesto[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("inventario_repuestos")
    .select(`
      id,
      existencia,
      stock_minimo,
      precio_compra,
      precio_venta,
      ubicacion_fisica,
      ultima_compra,
      sucursal_id,
      repuesto:repuestos (
        id,
        codigo_parte,
        nombre,
        marca,
        categoria:categorias_repuestos (nombre),
        proveedor:proveedores (razon_social)
      )
    `);

  if (error) {
    console.error("Error al cargar repuestos desde Supabase:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: String(row.id),
    nombre: row.repuesto?.nombre || "",
    codigo: row.repuesto?.codigo_parte || "",
    categoria: (row.repuesto?.categoria?.nombre || "Otro") as CategoriaRepuesto,
    marca: row.repuesto?.marca || "",
    sucursal: mapSucursalId(row.sucursal_id),
    existencia: row.existencia,
    stockMinimo: row.stock_minimo,
    precioCompra: Number(row.precio_compra),
    precioVenta: Number(row.precio_venta),
    proveedor: row.repuesto?.proveedor?.razon_social || "",
    ubicacion: row.ubicacion_fisica || "",
    fechaUltimaCompra: row.ultima_compra
      ? new Date(row.ultima_compra).toISOString().split("T")[0]
      : "",
  }));
}

// 2. Insertar Nuevo Repuesto en Supabase
export async function dbCrearRepuesto(r: Omit<Repuesto, "id">): Promise<string | null> {
  if (!supabase) return null;

  try {
    let categoriaId = 10;
    const safeCat = sanitizeLikePattern(r.categoria);
    const { data: catData, error: categoryError } = await supabase
      .from("categorias_repuestos")
      .select("id")
      .ilike("nombre", safeCat)
      .limit(1);
    if (categoryError) throw categoryError;

    if (catData && catData.length > 0) {
      categoriaId = catData[0].id;
    }

    let proveedorId = 1;
    if (r.proveedor) {
      const safeProv = sanitizeLikePattern(r.proveedor);
      const { data: provData, error: providerLookupError } = await supabase
        .from("proveedores")
        .select("id")
        .ilike("razon_social", safeProv)
        .limit(1);
      if (providerLookupError) throw providerLookupError;

      if (provData && provData.length > 0) {
        proveedorId = provData[0].id;
      } else {
        const { data: newProv, error: proveedorError } = await supabase
          .from("proveedores")
          .insert({ razon_social: r.proveedor.trim() })
          .select("id")
          .single();
        if (proveedorError) throw proveedorError;
        if (newProv) proveedorId = newProv.id;
      }
    }

    let repuestoId: number | null = null;
    const safeCodigo = sanitizeLikePattern(r.codigo);
    const { data: existingRep, error: repuestoLookupError } = await supabase
      .from("repuestos")
      .select("id")
      .ilike("codigo_parte", safeCodigo)
      .limit(1);
    if (repuestoLookupError) throw repuestoLookupError;

    if (existingRep && existingRep.length > 0) {
      repuestoId = existingRep[0].id;
    } else {
      const { data: newRep, error: repErr } = await supabase
        .from("repuestos")
        .insert({
          categoria_id: categoriaId,
          proveedor_id: proveedorId,
          codigo_parte: r.codigo.trim(),
          nombre: r.nombre.trim(),
          marca: r.marca.trim(),
        })
        .select("id")
        .single();

      if (repErr || !newRep) {
        console.error("Error insertando repuesto maestro:", repErr);
        throw repErr ?? new Error("No se creó el registro maestro del repuesto.");
      }
      repuestoId = newRep.id;
    }

    const targetSucursalId = unmapSucursalId(r.sucursal);

    const { data: existingInv, error: inventoryLookupError } = await supabase
      .from("inventario_repuestos")
      .select("id")
      .eq("repuesto_id", repuestoId)
      .eq("sucursal_id", targetSucursalId)
      .limit(1);
    if (inventoryLookupError) throw inventoryLookupError;

    if (existingInv && existingInv.length > 0) {
      const invId = existingInv[0].id;
      const { error: updateError } = await supabase
        .from("inventario_repuestos")
        .update({
          existencia: r.existencia,
          stock_minimo: r.stockMinimo,
          precio_compra: r.precioCompra,
          precio_venta: r.precioVenta,
          ubicacion_fisica: r.ubicacion,
          ultima_compra: r.fechaUltimaCompra || new Date().toISOString().split("T")[0],
        })
        .eq("id", invId);
      if (updateError) throw updateError;
      return String(invId);
    }

    const { data: newInv, error: invErr } = await supabase
      .from("inventario_repuestos")
      .insert({
        sucursal_id: targetSucursalId,
        repuesto_id: repuestoId,
        existencia: r.existencia,
        stock_minimo: r.stockMinimo,
        precio_compra: r.precioCompra,
        precio_venta: r.precioVenta,
        ubicacion_fisica: r.ubicacion,
        ultima_compra: r.fechaUltimaCompra || new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (invErr || !newInv) {
      console.error("Error insertando inventario_repuesto:", invErr);
      throw invErr ?? new Error("No se creó el registro de inventario del repuesto.");
    }

    return String(newInv.id);
  } catch (e) {
    console.error("Excepción al crear repuesto:", e);
    throw e;
  }
}

// 3. Actualizar Repuesto en Supabase
export async function dbActualizarRepuesto(r: Repuesto): Promise<boolean> {
  if (!supabase) return false;

  try {
    const numId = parseInt(r.id);
    if (isNaN(numId)) return false;

    // A. Actualizar inventario_repuestos y obtener repuesto_id
    const { data: invData, error: invErr } = await supabase
      .from("inventario_repuestos")
      .update({
        existencia: r.existencia,
        stock_minimo: r.stockMinimo,
        precio_compra: r.precioCompra,
        precio_venta: r.precioVenta,
        ubicacion_fisica: r.ubicacion,
        ultima_compra: r.fechaUltimaCompra || null,
      })
      .eq("id", numId)
      .select("repuesto_id")
      .maybeSingle();

    if (invErr) {
      console.error("Error al actualizar inventario_repuestos:", invErr);
      return false;
    }

    let repuestoId = invData?.repuesto_id;

    if (!repuestoId) {
      const { data: invSearch } = await supabase
        .from("inventario_repuestos")
        .select("repuesto_id")
        .eq("id", numId)
        .maybeSingle();
      repuestoId = invSearch?.repuesto_id;
    }

    if (!repuestoId) {
      console.error("No existe el registro de inventario que se intenta actualizar:", r.id);
      return false;
    }

    {
      // B. Resolver Categoria ID
      let categoriaId: number | null = null;
      if (r.categoria && r.categoria.trim()) {
        const safeCat = sanitizeLikePattern(r.categoria);
        const { data: catData } = await supabase
          .from("categorias_repuestos")
          .select("id")
          .ilike("nombre", safeCat)
          .limit(1);

        if (catData && catData.length > 0) {
          categoriaId = catData[0].id;
        } else {
          const { data: newCat } = await supabase
            .from("categorias_repuestos")
            .insert({ nombre: r.categoria.trim() })
            .select("id")
            .single();
          if (newCat) categoriaId = newCat.id;
        }
      }

      // C. Resolver Proveedor ID
      let proveedorId: number | null = null;
      if (r.proveedor && r.proveedor.trim()) {
        const safeProv = sanitizeLikePattern(r.proveedor);
        const { data: provData } = await supabase
          .from("proveedores")
          .select("id")
          .ilike("razon_social", safeProv)
          .limit(1);

        if (provData && provData.length > 0) {
          proveedorId = provData[0].id;
        } else {
          const { data: newProv } = await supabase
            .from("proveedores")
            .insert({ razon_social: r.proveedor.trim() })
            .select("id")
            .single();
          if (newProv) proveedorId = newProv.id;
        }
      }

      // D. Actualizar tabla repuestos
      const { error: repErr } = await supabase
        .from("repuestos")
        .update({
          nombre: r.nombre.trim(),
          codigo_parte: r.codigo.trim(),
          marca: r.marca.trim(),
          categoria_id: categoriaId,
          proveedor_id: proveedorId,
        })
        .eq("id", repuestoId);

      if (repErr) {
        console.error("Error actualizando la tabla repuestos:", repErr);
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("Error actualizando repuesto:", e);
    return false;
  }
}

// 4. Eliminar Repuesto en Supabase
export async function dbEliminarRepuesto(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const numId = parseInt(id);
    if (isNaN(numId)) return false;

    // 1. Obtener repuesto_id asociado
    const { data: invRow } = await supabase
      .from("inventario_repuestos")
      .select("repuesto_id")
      .eq("id", numId)
      .maybeSingle();

    const repuestoId = invRow?.repuesto_id;

    // 2. Eliminar referencias en movimientos_kardex para evitar error 409 (Foreign Key Violation)
    if (repuestoId) {
      await supabase
        .from("movimientos_kardex")
        .delete()
        .eq("repuesto_id", repuestoId);
    }
    await supabase
      .from("movimientos_kardex")
      .delete()
      .eq("inventario_id", numId);

    // 3. Eliminar de inventario_repuestos
    const { error: invDeleteErr } = await supabase
      .from("inventario_repuestos")
      .delete()
      .eq("id", numId);

    if (invDeleteErr) {
      console.error("Error eliminando de inventario_repuestos:", invDeleteErr);
      return false;
    }

    // 4. Si ninguna otra fila usa este repuesto maestro, eliminar de repuestos
    if (repuestoId) {
      const { count } = await supabase
        .from("inventario_repuestos")
        .select("id", { count: "exact", head: true })
        .eq("repuesto_id", repuestoId);

      if (count === 0) {
        await supabase.from("repuestos").delete().eq("id", repuestoId);
      }
    }

    return true;
  } catch (e) {
    console.error("Error eliminando repuesto:", e);
    return false;
  }
}

// 5. Registrar Movimiento (Kardex) y actualizar stock en Supabase
export async function dbRegistrarMovimiento(params: {
  repuestoId: string;
  repuestoNombre: string;
  repuestoCodigo: string;
  sucursal: Sucursal;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: string;
  folioReferencia?: string;
  usuarioId: string;
  usuarioNombre: string;
  notas?: string;
}): Promise<boolean> {
  if (!supabase) return false;

  const sucursalId = unmapSucursalId(params.sucursal);

  const targetInvId = Number(params.repuestoId);
  if (!Number.isInteger(targetInvId) || targetInvId <= 0) {
    console.error("ID de inventario inválido para registrar el movimiento:", params.repuestoId);
    return false;
  }

  const { data: inventoryRow, error: inventoryLookupError } = await supabase
    .from("inventario_repuestos")
    .select("id, repuesto_id")
    .eq("id", targetInvId)
    .eq("sucursal_id", sucursalId)
    .maybeSingle();
  if (inventoryLookupError || !inventoryRow) {
    console.error("No se encontró el inventario del movimiento:", inventoryLookupError);
    return false;
  }
  const maestroRepuestoId = inventoryRow.repuesto_id;
  if (!maestroRepuestoId) {
    console.error("El inventario no está asociado a un repuesto:", targetInvId);
    return false;
  }

  const { error: stockError } = await supabase
    .from("inventario_repuestos")
    .update({ existencia: params.stockResultante })
    .eq("id", targetInvId);

  if (stockError) {
    console.error("Error actualizando stock en Supabase:", stockError);
    return false;
  }

  let parsedUserId = Number(params.usuarioId);
  if (isNaN(parsedUserId)) {
    const { data: foundUser } = await supabase
      .from("usuarios")
      .select("id")
      .ilike("nombre", params.usuarioNombre)
      .limit(1);
    parsedUserId = foundUser && foundUser.length > 0 ? foundUser[0].id : 1;
  }

  const tipoUpper = params.tipo === "salida" ? "SALIDA" : "ENTRADA";
  const { error: kardexError } = await supabase.from("movimientos_kardex").insert({
    repuesto_id: maestroRepuestoId,
    sucursal_id: sucursalId,
    usuario_id: parsedUserId,
    tipo_movimiento: tipoUpper,
    cantidad: params.cantidad,
    stock_resultante: params.stockResultante,
    folio_referencia: params.folioReferencia || null,
    notas: params.notas || params.motivo || null,
  });

  if (kardexError) {
    console.error("Error insertando en movimientos_kardex:", kardexError);
    return false;
  }

  return true;
}

// 6. Cargar Kardex / Movimientos desde Supabase
export async function dbFetchMovimientos(): Promise<MovimientoInventario[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("movimientos_kardex")
    .select(`
      id,
      tipo_movimiento,
      cantidad,
      stock_resultante,
      folio_referencia,
      notas,
      fecha_creacion,
      sucursal_id,
      repuesto:repuestos (id, nombre, codigo_parte),
      usuario:usuarios (id, nombre)
    `)
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error cargando kardex:", error);
    throw error;
  }

  return (data || []).map((row: any) => {
    const esEntrada = row.tipo_movimiento === "ENTRADA";
    const fechaDate = new Date(row.fecha_creacion);
    const fechaStr = `${fechaDate.getFullYear()}-${String(fechaDate.getMonth() + 1).padStart(2, "0")}-${String(fechaDate.getDate()).padStart(2, "0")} ${String(fechaDate.getHours()).padStart(2, "0")}:${String(fechaDate.getMinutes()).padStart(2, "0")}`;

    return {
      id: String(row.id),
      repuestoId: String(row.repuesto?.id || ""),
      repuestoNombre: row.repuesto?.nombre || "Repuesto",
      repuestoCodigo: row.repuesto?.codigo_parte || "COD",
      sucursal: mapSucursalId(row.sucursal_id),
      tipo: esEntrada ? "entrada" : "salida",
      cantidad: row.cantidad,
      stockAnterior: esEntrada
        ? row.stock_resultante - row.cantidad
        : row.stock_resultante + row.cantidad,
      stockResultante: row.stock_resultante,
      motivo: row.notas || (esEntrada ? "Compra / Entrada" : "Venta / Salida"),
      folioReferencia: row.folio_referencia || undefined,
      fecha: fechaStr,
      usuarioId: String(row.usuario?.id || ""),
      usuarioNombre: row.usuario?.nombre || "Usuario",
      notas: row.notas || undefined,
    };
  });
}

// 7. Cargar Herramientas desde Supabase
export async function dbFetchHerramientas(): Promise<Herramienta[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from("herramientas").select("*");

  if (error) {
    console.error("Error cargando herramientas:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: String(row.id),
    nombre: row.nombre,
    codigo: row.codigo_unico,
    categoria: row.categoria,
    sucursal: mapSucursalId(row.sucursal_id),
    estado: row.estado,
    notas: row.notas || undefined,
  }));
}

// 8. Crear / Editar / Eliminar Herramienta
export async function dbCrearHerramienta(h: Omit<Herramienta, "id">): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("herramientas")
    .insert({
      sucursal_id: unmapSucursalId(h.sucursal),
      codigo_unico: h.codigo,
      nombre: h.nombre,
      categoria: h.categoria,
      estado: h.estado,
      notas: h.notas || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error insertando herramienta:", error);
    return null;
  }
  return String(data.id);
}

export async function dbActualizarHerramienta(h: Herramienta): Promise<boolean> {
  if (!supabase) return false;
  const numId = parseInt(h.id);
  if (isNaN(numId)) return false;

  const { error } = await supabase
    .from("herramientas")
    .update({
      sucursal_id: unmapSucursalId(h.sucursal),
      codigo_unico: h.codigo,
      nombre: h.nombre,
      categoria: h.categoria,
      estado: h.estado,
      notas: h.notas || null,
    })
    .eq("id", numId);

  return !error;
}

export async function dbEliminarHerramienta(id: string): Promise<boolean> {
  if (!supabase) return false;
  const numId = parseInt(id);
  if (isNaN(numId)) return false;
  const { error } = await supabase.from("herramientas").delete().eq("id", numId);
  return !error;
}

// 8.5 Autenticar usuario con Supabase Auth nativo
export async function dbLoginUsuario(
  email: string,
  pass: string
): Promise<{ ok: boolean; usuario?: Usuario; error?: string }> {
  if (!supabase) return { ok: false, error: "Base de datos Supabase no configurada." };

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Autenticación oficial usando Supabase Auth nativo
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (authError || !authData.user) {
      if (authError?.code === "invalid_credentials") {
        return { ok: false, error: "El correo o la contraseña no son correctos." };
      }
      if (authError?.code === "email_not_confirmed") {
        return { ok: false, error: "El correo de esta cuenta aún no está confirmado." };
      }
      if (authError) {
        console.error("Error de Supabase Auth al iniciar sesión:", authError);
        return { ok: false, error: "No se pudo validar el inicio de sesión. Revisa tu conexión e inténtalo de nuevo." };
      }
      return { ok: false, error: "No se pudo validar la cuenta. Inténtalo de nuevo." };
    }

    const { data: userData, error: profileError } = await supabase
      .from("usuarios")
      .select("id, nombre, email, rol, sucursal_id, activo, password_temporal")
      .eq("auth_id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      console.error("Error al cargar el perfil autenticado:", profileError);
      return { ok: false, error: "No se pudo validar el perfil. Contacta al administrador." };
    }

    if (!userData || !userData.activo) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: userData ? "El usuario se encuentra inactivo." : "No existe un perfil asociado a esta cuenta.",
      };
    }

    if (userData.rol !== "gerente" && userData.rol !== "vendedor") {
      await supabase.auth.signOut();
      console.error("El perfil tiene un rol no permitido:", userData.rol);
      return { ok: false, error: "El perfil tiene un rol inválido. Contacta al administrador." };
    }

    const u: Usuario = {
      id: String(userData.id),
      nombre: userData.nombre,
      email: userData.email,
      password: "",
      rol: userData.rol,
      sucursal: mapSucursalId(userData.sucursal_id),
      activo: Boolean(userData.activo),
      passwordTemporal: Boolean(userData.password_temporal),
    };

    return { ok: true, usuario: u };
  } catch (err) {
    console.error("Excepción en dbLoginUsuario:", err);
    return { ok: false, error: "Error inesperado al conectar con la base de datos." };
  }
}

export async function dbFetchUsuarioAutenticado(): Promise<Usuario | null> {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`No se pudo validar la sesión de Supabase: ${authError.message}`);
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, sucursal_id, activo, password_temporal")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el perfil autenticado: ${error.message}`);
  if (!data || !data.activo) return null;
  if (data.rol !== "gerente" && data.rol !== "vendedor") {
    throw new Error(`Rol inválido en el perfil autenticado: ${data.rol}`);
  }

  return {
    id: String(data.id),
    nombre: data.nombre,
    email: data.email,
    password: "",
    rol: data.rol,
    sucursal: mapSucursalId(data.sucursal_id),
    activo: Boolean(data.activo),
    passwordTemporal: Boolean(data.password_temporal),
  };
}

// 9. Cargar y Gestionar Usuarios
export async function dbFetchUsuarios(): Promise<Usuario[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, sucursal_id, activo, password_temporal");
  if (error) {
    console.error("Error cargando usuarios:", error);
    throw error;
  }
  return (data || []).map((row: any) => ({
    id: String(row.id),
    nombre: row.nombre,
    email: row.email,
    password: "",
    rol: row.rol,
    sucursal: mapSucursalId(row.sucursal_id),
    activo: Boolean(row.activo),
    passwordTemporal: Boolean(row.password_temporal),
  }));
}

// 10. Crear usuario validado en Supabase Auth y registrado en la BD
export async function dbCrearUsuario(
  u: Omit<Usuario, "id">
): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: "Supabase no está configurado." };

  const cleanEmail = u.email.trim().toLowerCase();

  try {
    await supabase.rpc("setval_usuarios_seq" as never);
  } catch {
    // Si la función RPC no existe, continuamos
  }

  // No crear un perfil si Supabase Auth rechazó el alta.
  let authUserId: string;
  try {
    const authCreationClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
    const { data: signUpData, error: signUpErr } = await authCreationClient.auth.signUp({
      email: cleanEmail,
      password: u.password,
      options: {
        data: {
          nombre: u.nombre.trim(),
          rol: u.rol,
          sucursal_id: unmapSucursalId(u.sucursal),
        },
      },
    });

    if (signUpErr) {
      console.error("Supabase Auth rechazó la creación del usuario:", signUpErr);
      return { error: signUpErr.message };
    }

    if (!signUpData.user) {
      return { error: "Supabase Auth no devolvió la cuenta creada." };
    }
    if (signUpData.user.identities?.length === 0) {
      return { error: "Ya existe una cuenta de autenticación con este correo." };
    }
    authUserId = signUpData.user.id;
  } catch (authEx) {
    console.error("Excepción al registrar en Supabase Auth:", authEx);
    return {
      error: authEx instanceof Error ? authEx.message : "No se pudo crear la cuenta en Supabase Auth.",
    };
  }

  // 2. Insertar perfil en la tabla 'usuarios'
  const payload: Record<string, unknown> = {
    sucursal_id: unmapSucursalId(u.sucursal),
    nombre: u.nombre.trim(),
    email: cleanEmail,
    rol: u.rol,
    activo: u.activo,
  };

  payload.auth_id = authUserId;

  const { data, error } = await supabase
    .from("usuarios")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.error(
        "❌ Error de secuencia en tabla 'usuarios': corre este SQL en Supabase SQL Editor:\n" +
        "SELECT setval(pg_get_serial_sequence('usuarios', 'id'), (SELECT MAX(id) FROM usuarios));"
      );
    } else {
      console.error("Error creando usuario en Supabase:", error);
    }
    return { error: `La cuenta Auth se creó, pero no se pudo guardar su perfil: ${error.message}` };
  }
  return { id: String(data.id) };
}

// 11. Actualizar usuario en Supabase
export async function dbActualizarUsuario(u: Usuario): Promise<boolean> {
  if (!supabase) return false;
  const numId = parseInt(u.id, 10);
  const isNum = !isNaN(numId);
  const cleanEmail = u.email.trim().toLowerCase();

  const payload: Record<string, unknown> = {
    sucursal_id: unmapSucursalId(u.sucursal),
    nombre: u.nombre.trim(),
    email: cleanEmail,
    rol: u.rol,
    activo: u.activo,
  };
  try {
    if (isNum) {
      const { error } = await supabase.from("usuarios").update(payload).eq("id", numId);
      if (!error) return true;
    }
    if (cleanEmail) {
      const { error } = await supabase.from("usuarios").update(payload).ilike("email", cleanEmail);
      if (!error) return true;
    }
  } catch (e) {
    console.error("Error al actualizar usuario en Supabase:", e);
  }
  return false;
}

// 12. Activar / Desactivar usuario en Supabase
export async function dbToggleUsuario(id: string, activo: boolean): Promise<boolean> {
  if (!supabase) return false;
  const numId = parseInt(id);
  if (isNaN(numId)) return false;
  const { error } = await supabase.from("usuarios").update({ activo }).eq("id", numId);
  if (error) {
    console.error("Error cambiando estado de usuario en Supabase:", error);
    return false;
  }
  return true;
}

// 13. Eliminar usuario en Supabase de forma permanente
export async function dbEliminarUsuario(id: string, email?: string): Promise<boolean> {
  if (!supabase) return false;

  const numId = parseInt(id, 10);
  const isNum = !isNaN(numId);

  try {
    let error: any = null;
    if (isNum) {
      const res = await supabase.from("usuarios").delete().eq("id", numId);
      error = res.error;
    } else {
      const res = await supabase.from("usuarios").delete().eq("id", id);
      error = res.error;
    }

    if (error && email) {
      const resMail = await supabase.from("usuarios").delete().ilike("email", email.trim());
      error = resMail.error;
    }

    if (error && (error.code === "23503" || error.message?.includes("foreign key"))) {
      console.warn("Desvinculando referencias de Kardex para permitir la eliminación del usuario...");
      if (isNum) {
        await supabase.from("movimientos_kardex").update({ usuario_id: null }).eq("usuario_id", numId);
        const retry = await supabase.from("usuarios").delete().eq("id", numId);
        error = retry.error;
      }
    }

    if (error) {
      console.error("Error al eliminar usuario en Supabase:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Excepción en dbEliminarUsuario:", err);
    return false;
  }
}

// 14. Solicitar recuperación de contraseña (envía enlace de Supabase Auth)
export async function dbSolicitarRecuperacionPassword(
  email: string
): Promise<{ ok: boolean; error?: string; authResent?: boolean }> {
  if (!supabase) return { ok: false, error: "Base de datos Supabase no configurada." };

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/?type=recovery`,
    });
    if (resetError) {
      console.error("Error de Supabase Auth al enviar recuperación:", resetError);
      return { ok: false, error: resetError.message, authResent: false };
    }

    return { ok: true, authResent: true };
  } catch (err: any) {
    console.error("Excepción en dbSolicitarRecuperacionPassword:", err);
    return { ok: false, error: "Ocurrió un error inesperado al procesar la solicitud." };
  }
}

// 15. Cambiar contraseña definitiva
export async function dbCambiarPasswordUsuario(
  nuevaPassword: string,
  email?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Base de datos Supabase no configurada." };

  const cleanPass = nuevaPassword;
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  try {
    const { data, error: authError } = await supabase.auth.getUser();
    const authenticatedEmail = data.user?.email?.trim().toLowerCase();
    if (authError || !data.user || (cleanEmail && authenticatedEmail !== cleanEmail)) {
      return { ok: false, error: "La sesión de recuperación expiró. Solicita un enlace nuevo." };
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password: cleanPass });
    if (passwordError) {
      return { ok: false, error: passwordError.message || "Supabase Auth no pudo actualizar la contraseña." };
    }

    const { error: profileError } = await supabase.rpc("genesis_clear_own_temporary_password");
    if (profileError) {
      console.error("La contraseña se actualizó, pero no se pudo cerrar el estado temporal:", profileError);
      return {
        ok: false,
        error: "La contraseña se actualizó, pero no se pudo actualizar el perfil. Contacta al administrador.",
      };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Excepción en dbCambiarPasswordUsuario:", err);
    return { ok: false, error: "Error inesperado al cambiar contraseña." };
  }
}

// Se conserva la API para llamadas existentes, pero no se deben reinsertar
// registros de demostración sobre una base de datos real.
export async function dbSembrarDatosIniciales(): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: "La carga de datos de demostración está deshabilitada para proteger los registros reales.",
  };
}