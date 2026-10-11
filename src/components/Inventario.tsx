import { useState } from "react";
import { useApp } from "../context";
import { SUCURSALES, CATEGORIAS_REPUESTO, MOTIVOS_SALIDA, MOTIVOS_ENTRADA } from "../data";
import type { Repuesto, Sucursal, CategoriaRepuesto, TipoMovimiento } from "../types";

const EMPTY: Omit<Repuesto, "id"> = {
  nombre: "",
  codigo: "",
  categoria: "Motor",
  marca: "",
  sucursal: "sucursal1",
  existencia: 0,
  stockMinimo: 5,
  precioCompra: 0,
  precioVenta: 0,
  proveedor: "",
  ubicacion: "",
  fechaUltimaCompra: new Date().toISOString().split("T")[0],
};

export function generarCodigoAutomatico(
  categoria: string,
  repuestosList: Repuesto[]
): string {
  const prefixMap: Record<string, string> = {
    Filtros: "FIL",
    Frenos: "FRE",
    Lubricantes: "LUB",
    Suspensión: "SUS",
    Eléctrico: "ELE",
    Motor: "MOT",
    Transmisión: "TRA",
    Carrocería: "CAR",
    Neumáticos: "NEU",
  };
  const prefix = prefixMap[categoria] || "REP";
  let maxNum = 0;
  for (const r of repuestosList) {
    const numPart = r.codigo.replace(/^[A-Z]+-?/i, "");
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  const nextNum = Math.max(maxNum + 1, repuestosList.length + 1);
  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

// Modal para crear / editar repuesto maestro
function ModalRepuesto({
  titulo,
  repuesto,
  onClose,
  onSave,
  esGerente,
  repuestosExistentes = [],
}: {
  titulo: string;
  repuesto: Omit<Repuesto, "id"> & { id?: string };
  onClose: () => void;
  onSave: (r: typeof repuesto) => void;
  esGerente: boolean;
  repuestosExistentes?: Repuesto[];
}) {
  const [form, setForm] = useState(repuesto);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleCategoriaChange = (nuevaCat: CategoriaRepuesto) => {
    setForm((p) => {
      const nuevoCodigo = p.id
        ? p.codigo
        : generarCodigoAutomatico(nuevaCat, repuestosExistentes);
      return { ...p, categoria: nuevaCat, codigo: nuevoCodigo };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="font-semibold text-[var(--foreground)]">{titulo}</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded-md"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Nombre del repuesto *
              </label>
              <input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                className="input-field"
                placeholder="Ej. Filtro de aceite Toyota Corolla"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                  Código de parte *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    set("codigo", generarCodigoAutomatico(form.categoria, repuestosExistentes))
                  }
                  className="text-[10px] text-[var(--primary)] hover:underline font-semibold"
                >
                  ⚡ Autogenerar
                </button>
              </div>
              <input
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)}
                className="input-field font-mono-data"
                placeholder="FAC-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Marca
              </label>
              <input
                value={form.marca}
                onChange={(e) => set("marca", e.target.value)}
                className="input-field"
                placeholder="Toyota, Bosch, Brembo..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Categoría
              </label>
              <select
                value={form.categoria}
                onChange={(e) => handleCategoriaChange(e.target.value as CategoriaRepuesto)}
                className="input-field"
              >
                {CATEGORIAS_REPUESTO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {esGerente && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                  Sucursal
                </label>
                <select
                  value={form.sucursal}
                  onChange={(e) => set("sucursal", e.target.value as Sucursal)}
                  className="input-field"
                >
                  <option value="sucursal1">{SUCURSALES.sucursal1}</option>
                  <option value="sucursal2">{SUCURSALES.sucursal2}</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Stock inicial
              </label>
              <input
                type="number"
                min="0"
                value={form.existencia}
                onChange={(e) => set("existencia", Math.max(0, +e.target.value))}
                className="input-field font-mono-data"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Stock mínimo
              </label>
              <input
                type="number"
                min="0"
                value={form.stockMinimo}
                onChange={(e) => set("stockMinimo", Math.max(0, +e.target.value))}
                className="input-field font-mono-data"
              />
            </div>
            {esGerente && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                  Precio de compra $
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precioCompra}
                  onChange={(e) => set("precioCompra", Math.max(0, +e.target.value))}
                  className="input-field font-mono-data"
                />
              </div>
            )}
            <div className={esGerente ? "" : "col-span-2"}>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Precio de venta $
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precioVenta}
                onChange={(e) => set("precioVenta", Math.max(0, +e.target.value))}
                className="input-field font-mono-data"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Proveedor
              </label>
              <input
                value={form.proveedor}
                onChange={(e) => set("proveedor", e.target.value)}
                className="input-field"
                placeholder="Nombre del proveedor"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Ubicación en taller / estante
              </label>
              <input
                value={form.ubicacion}
                onChange={(e) => set("ubicacion", e.target.value)}
                className="input-field"
                placeholder="Ej. A1-E2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                Fecha última compra
              </label>
              <input
                type="date"
                value={form.fechaUltimaCompra}
                onChange={(e) => set("fechaUltimaCompra", e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)] shrink-0">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (form.nombre && form.codigo) onSave(form);
            }}
            className="btn-primary"
          >
            Guardar repuesto
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de Movimiento de Stock (ENTRADA o SALIDA/VENTA)
function ModalMovimiento({
  repuesto,
  tipoInicial,
  onClose,
  onConfirm,
}: {
  repuesto: Repuesto;
  tipoInicial: TipoMovimiento;
  onClose: () => void;
  onConfirm: (data: {
    repuestoId: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
    folioReferencia?: string;
    notas?: string;
  }) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoInicial);
  const [cantidad, setCantidad] = useState<number>(1);
  const motivosDisponibles = tipo === "salida" ? MOTIVOS_SALIDA : MOTIVOS_ENTRADA;
  const [motivo, setMotivo] = useState<string>(motivosDisponibles[0]);
  const [folio, setFolio] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleTipoChange = (nuevoTipo: TipoMovimiento) => {
    setTipo(nuevoTipo);
    setMotivo(nuevoTipo === "salida" ? MOTIVOS_SALIDA[0] : MOTIVOS_ENTRADA[0]);
    setError(null);
  };

  const handleGuardar = async () => {
    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (tipo === "salida" && cantidad > repuesto.existencia) {
      setError(`Stock insuficiente. Solo hay ${repuesto.existencia} unidades disponibles.`);
      return;
    }

    const res = await onConfirm({
      repuestoId: repuesto.id,
      tipo,
      cantidad,
      motivo,
      folioReferencia: folio,
      notas,
    });

    if (!res.ok) {
      setError(res.error || "Ocurrió un error al procesar el movimiento.");
    } else {
      onClose();
    }
  };


  const stockProyectado =
    tipo === "entrada"
      ? repuesto.existencia + (cantidad || 0)
      : repuesto.existencia - (cantidad || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[var(--foreground)] text-base">
              Registrar Movimiento de Inventario
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {SUCURSALES[repuesto.sucursal]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-md transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selector de Tipo */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--secondary)] rounded-lg">
            <button
              type="button"
              onClick={() => handleTipoChange("salida")}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tipo === "salida"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
              </svg>
              SALIDA / VENTA (-)
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange("entrada")}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tipo === "entrada"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
              </svg>
              ENTRADA / SURTIDO (+)
            </button>
          </div>

          {/* Ficha resumen del repuesto */}
          <div className="bg-[var(--secondary)]/70 border border-[var(--border)] rounded-lg p-3">
            <p className="font-semibold text-sm text-[var(--foreground)]">{repuesto.nombre}</p>
            <div className="flex items-center justify-between mt-1 text-xs text-[var(--muted-foreground)]">
              <span>Código: <strong className="text-[var(--foreground)] font-mono-data">{repuesto.codigo}</strong></span>
              <span>Precio Venta: <strong className="text-[var(--foreground)] font-mono-data">${repuesto.precioVenta.toLocaleString("es-MX")}</strong></span>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
              <span>Stock actual: <strong className="font-mono-data text-[var(--foreground)]">{repuesto.existencia} pzas</strong></span>
              <span className="font-medium">
                Stock resultante:{" "}
                <strong
                  className={`font-mono-data ${
                    stockProyectado < 0
                      ? "text-red-400"
                      : tipo === "entrada"
                      ? "text-[var(--success)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {stockProyectado} pzas
                </strong>
              </span>
            </div>
          </div>

          {/* Cantidad con botones rápidos */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Cantidad a {tipo === "salida" ? "despachar / vender" : "ingresar"} *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={tipo === "salida" ? repuesto.existencia : undefined}
                value={cantidad}
                onChange={(e) => {
                  setCantidad(Math.max(1, parseInt(e.target.value) || 0));
                  setError(null);
                }}
                className="input-field font-mono-data text-lg font-bold text-center flex-1"
              />
              <div className="flex gap-1">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setCantidad((prev) => prev + n);
                      setError(null);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-[var(--secondary)] hover:bg-[var(--border)] rounded-md text-[var(--foreground)] transition-colors"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Motivo del movimiento *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="input-field"
            >
              {motivosDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Folio de referencia */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Folio de referencia (No. Ticket / Factura / Orden)
            </label>
            <input
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder={tipo === "salida" ? "Ej. TKT-10492 o Venta mostrador" : "Ej. FAC-889 o Pedido"}
              className="input-field font-mono-data"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Notas u observaciones (opcional)
            </label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Entregado al cliente Juan / Para cambio de frenos"
              className="input-field"
            />
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-2.5 flex items-center gap-2 text-xs text-red-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--secondary)]/20">
          <button onClick={onClose} className="btn-secondary text-xs">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className={`text-xs font-bold px-4 py-2 rounded-md transition-colors text-white ${
              tipo === "salida"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Confirmar {tipo === "salida" ? "Salida / Venta" : "Entrada (+)"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventario() {
  const {
    usuarioActual,
    repuestos,
    agregarRepuesto,
    editarRepuesto,
    eliminarRepuesto,
    registrarMovimiento,
  } = useApp();

  if (!usuarioActual) return null;

  const esGerente = usuarioActual.rol === "gerente";

  const [sucursalTab, setSucursalTab] = useState<Sucursal>(usuarioActual.sucursal);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 12;

  const [modalRepuesto, setModalRepuesto] = useState<null | {
    tipo: "nuevo" | "editar";
    data: Omit<Repuesto, "id"> & { id?: string };
  }>(null);

  const [modalMovimiento, setModalMovimiento] = useState<null | {
    repuesto: Repuesto;
    tipo: TipoMovimiento;
  }>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const repuestosSucursal = repuestos.filter((r) => r.sucursal === sucursalTab);

  const filtrados = repuestosSucursal.filter((r) => {
    const matchCat = categoriaFiltro === "Todas" || r.categoria === categoriaFiltro;
    const q = busqueda.toLowerCase();
    const matchQ =
      !q ||
      r.nombre.toLowerCase().includes(q) ||
      r.codigo.toLowerCase().includes(q) ||
      r.marca.toLowerCase().includes(q) ||
      r.ubicacion.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina) || 1;
  const paginaValida = Math.min(paginaActual, totalPaginas);
  const paginados = filtrados.slice(
    (paginaValida - 1) * elementosPorPagina,
    paginaValida * elementosPorPagina
  );

  const categorias = ["Todas", ...Array.from(new Set(repuestosSucursal.map((r) => r.categoria)))];

  const handleSaveRepuesto = (data: Omit<Repuesto, "id"> & { id?: string }) => {
    if (data.id) {
      editarRepuesto(data as Repuesto);
    } else {
      const d = { ...data };
      if (!esGerente) d.sucursal = usuarioActual.sucursal;
      agregarRepuesto(d);
    }
    setModalRepuesto(null);
  };

  const handleNuevo = () => {
    const autoCodigo = generarCodigoAutomatico("Motor", repuestos);
    setModalRepuesto({
      tipo: "nuevo",
      data: {
        ...EMPTY,
        codigo: autoCodigo,
        sucursal: esGerente ? sucursalTab : usuarioActual.sucursal,
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Modal Alta / Edición Repuesto */}
      {modalRepuesto && (
        <ModalRepuesto
          titulo={modalRepuesto.tipo === "nuevo" ? "Alta de Nuevo Repuesto" : "Editar Catálogo de Repuesto"}
          repuesto={modalRepuesto.data}
          onClose={() => setModalRepuesto(null)}
          onSave={handleSaveRepuesto}
          esGerente={esGerente}
          repuestosExistentes={repuestos}
        />
      )}

      {/* Modal Entrada / Salida */}
      {modalMovimiento && (
        <ModalMovimiento
          repuesto={modalMovimiento.repuesto}
          tipoInicial={modalMovimiento.tipo}
          onClose={() => setModalMovimiento(null)}
          onConfirm={registrarMovimiento}
        />
      )}

      {/* Modal Confirmación de Eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">Eliminar repuesto</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">
              Esta acción no se puede deshacer. ¿Confirmas eliminar este repuesto del catálogo?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={() => {
                  eliminarRepuesto(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="font-display text-2xl text-[var(--foreground)]">Inventario</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Gestión de repuestos, registro de salidas (ventas) y entradas por sucursal
            </p>
          </div>
          <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 1 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Nuevo repuesto
          </button>
        </div>

        {/* Branch Selector / Multisucursal Consultation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-[var(--card)] border border-[var(--border)] p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider pl-2">
              Sucursal:
            </span>
            <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg">
              {(["sucursal1", "sucursal2"] as const).map((s) => {
                const esMiSucursal = usuarioActual.sucursal === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSucursalTab(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      sucursalTab === s
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm font-semibold"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span>{SUCURSALES[s]}</span>
                    {esMiSucursal && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" title="Tu sucursal actual" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Notice for Sellers checking another branch */}
          {sucursalTab !== usuarioActual.sucursal && (
            <div className="flex items-center gap-2 text-xs text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              <span>
                Consultando existencias de <strong>{SUCURSALES[sucursalTab]}</strong> para traspasos o ventas cruzadas.
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código de parte, marca o ubicación..."
              className="input-field pl-9"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="input-field w-auto"
          >
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total repuestos", value: repuestosSucursal.length, color: "" },
            {
              label: "Sin stock (Agotados)",
              value: repuestosSucursal.filter((r) => r.existencia === 0).length,
              color: "text-red-400",
            },
            {
              label: "Stock bajo",
              value: repuestosSucursal.filter(
                (r) => r.existencia > 0 && r.existencia <= r.stockMinimo
              ).length,
              color: "text-yellow-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <span className="text-xs text-[var(--muted-foreground)]">{s.label}</span>
              <span className={`font-mono-data font-bold text-lg ${s.color || "text-[var(--foreground)]"}`}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Table (sin margen) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/30">
                  {[
                    "Código",
                    "Repuesto",
                    "Categoría",
                    "Ubicación",
                    "Existencia",
                    ...(esGerente ? ["P. Compra"] : []),
                    "P. Venta",
                    "Acciones de Stock (Venta / Entrada)",
                    "Acciones",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={esGerente ? 9 : 8} className="px-4 py-12 text-center text-[var(--muted-foreground)] text-sm">
                      No se encontraron repuestos con esos filtros en {SUCURSALES[sucursalTab]}.
                    </td>
                  </tr>
                ) : (
                  paginados.map((r) => {
                    const sinStock = r.existencia === 0;
                    const bajoStock = !sinStock && r.existencia <= r.stockMinimo;

                    return (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border)]/60 hover:bg-[var(--secondary)]/40 transition-colors text-xs"
                      >
                        {/* Código */}
                        <td className="px-4 py-3 font-mono-data font-semibold text-[var(--primary)] whitespace-nowrap">
                          {r.codigo}
                        </td>

                        {/* Nombre y proveedor */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--foreground)]">{r.nombre}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            {r.marca} {r.proveedor && `· ${r.proveedor}`}
                          </p>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3">
                          <span className="inline-block bg-[var(--secondary)] text-[var(--secondary-foreground)] text-[10px] px-2 py-0.5 rounded-full font-medium border border-[var(--border)]">
                            {r.categoria}
                          </span>
                        </td>

                        {/* Ubicación */}
                        <td className="px-4 py-3 font-mono-data text-xs text-[var(--muted-foreground)]">
                          {r.ubicacion || "—"}
                        </td>

                        {/* Existencia */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono-data text-xs font-bold ${
                                sinStock
                                  ? "text-red-400"
                                  : bajoStock
                                  ? "text-amber-400"
                                  : "text-[var(--success)]"
                              }`}
                            >
                              {r.existencia}
                            </span>
                            {sinStock && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/80 text-red-400">
                                Sin stock
                              </span>
                            )}
                            {bajoStock && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-400">
                                Mín. {r.stockMinimo}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* P. Compra (Gerente) */}
                        {esGerente && (
                          <td className="px-4 py-3 font-mono-data text-xs text-[var(--muted-foreground)]">
                            ${r.precioCompra.toLocaleString("es-MX")}
                          </td>
                        )}

                        {/* P. Venta */}
                        <td className="px-4 py-3 font-mono-data text-xs font-semibold text-[var(--foreground)]">
                          ${r.precioVenta.toLocaleString("es-MX")}
                        </td>

                        {/* BOTONES DE MOVIMIENTO: SALIDA Y ENTRADA */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {/* Botón Salida / Venta */}
                            <button
                              type="button"
                              onClick={() => setModalMovimiento({ repuesto: r, tipo: "salida" })}
                              disabled={sinStock}
                              title={sinStock ? "Sin existencia para vender" : "Registrar Salida / Venta"}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                sinStock
                                  ? "opacity-40 cursor-not-allowed bg-neutral-800 text-neutral-500"
                                  : "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30"
                              }`}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                              </svg>
                              <span>- Salida</span>
                            </button>

                            {/* Botón Entrada / Surtido */}
                            <button
                              type="button"
                              onClick={() => setModalMovimiento({ repuesto: r, tipo: "entrada" })}
                              title="Registrar Entrada / Compra"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--success)]/15 hover:bg-[var(--success)]/25 text-[var(--success)] border border-[var(--success)]/30 transition-all"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                              </svg>
                              <span>+ Entrada</span>
                            </button>
                          </div>
                        </td>

                        {/* Botones de Editar y Eliminar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setModalRepuesto({ tipo: "editar", data: r })}
                              title="Editar datos del repuesto"
                              className="p-1.5 rounded-md hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                              </svg>
                            </button>
                            {esGerente && (
                              <button
                                onClick={() => setConfirmDelete(r.id)}
                                title="Eliminar del catálogo"
                                className="p-1.5 rounded-md bg-red-950/50 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                  <path
                                    fillRule="evenodd"
                                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
          <p className="text-xs text-[var(--muted-foreground)]">
            Mostrando {filtrados.length === 0 ? 0 : (paginaValida - 1) * elementosPorPagina + 1} a{" "}
            {Math.min(paginaValida * elementosPorPagina, filtrados.length)} de {filtrados.length} repuestos
          </p>
          {totalPaginas > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaValida === 1}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs font-mono-data px-2 text-[var(--muted-foreground)]">
                Página {paginaValida} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaValida === totalPaginas}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--muted)] transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
