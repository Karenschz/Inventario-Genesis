import { useState } from "react";
import { useApp } from "../context";
import { SUCURSALES, CATEGORIAS_HERRAMIENTA } from "../data";
import type { Herramienta, Sucursal, CategoriaHerramienta, EstadoHerramienta } from "../types";
import jsPDF from "jspdf";

const EMPTY: Omit<Herramienta, "id"> = {
  nombre: "",
  codigo: "",
  categoria: "Herramienta manual",
  sucursal: "sucursal1",
  estado: "disponible",
  precio: 0,
  asignadoA: "",
  fechaAsignacion: "",
  notas: "",
};

const ESTADOS_FILTRO = ["todas", "disponible", "en_uso", "en_reparacion", "dañado"] as const;
type EstadoFiltro = (typeof ESTADOS_FILTRO)[number];

function Modal({
  titulo,
  herramienta,
  onClose,
  onSave,
  esGerente,
}: {
  titulo: string;
  herramienta: Omit<Herramienta, "id"> & { id?: string };
  onClose: () => void;
  onSave: (h: typeof herramienta) => void;
  esGerente: boolean;
}) {
  const [form, setForm] = useState(herramienta);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

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
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Nombre *</label>
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className="input-field" placeholder="Llave de impacto 1/2&quot;" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Código</label>
              <input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} className="input-field font-mono-data" placeholder="LIM-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Categoría</label>
              <select value={form.categoria} onChange={(e) => set("categoria", e.target.value as CategoriaHerramienta)} className="input-field">
                {CATEGORIAS_HERRAMIENTA.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Precio</label>
            <input type="number" min="0" step="0.01" value={form.precio ?? 0} onChange={(e) => set("precio", Number(e.target.value) || 0)} className="input-field" placeholder="2500" />
          </div>
          {esGerente && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Sucursal</label>
              <select value={form.sucursal} onChange={(e) => set("sucursal", e.target.value as Sucursal)} className="input-field">
                <option value="sucursal1">{SUCURSALES.sucursal1}</option>
                <option value="sucursal2">{SUCURSALES.sucursal2}</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Estado</label>
            <select value={form.estado} onChange={(e) => set("estado", e.target.value as EstadoHerramienta)} className="input-field">
              <option value="disponible">Disponible</option>
              <option value="en_uso">En uso</option>
              <option value="en_reparacion">En reparación</option>
              <option value="dañado">Dañado</option>
            </select>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Notas</label>
            <input value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} className="input-field" placeholder="Observaciones..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => { if (form.nombre) onSave(form); }} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function generarReporteHerramientasPDF(
  herramientasSucursal: Herramienta[],
  repuestosSucursal: ReturnType<typeof useApp>["repuestos"],
  sucursal: Sucursal
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fechaDescarga = new Date();
  const fechaArchivo = [
    fechaDescarga.getFullYear(),
    String(fechaDescarga.getMonth() + 1).padStart(2, "0"),
    String(fechaDescarga.getDate()).padStart(2, "0"),
  ].join("-");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const fmtMoney = (value: number) =>
    "$" + value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let y = 22;
  const checkPage = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const valorInventario = repuestosSucursal.reduce(
    (total, repuesto) => total + repuesto.existencia * repuesto.precioCompra,
    0
  );
  const valorHerramientas = herramientasSucursal.reduce(
    (total, herramienta) => total + (herramienta.precio ?? 0),
    0
  );
  const totalGeneral = valorInventario + valorHerramientas;

  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 0, 5, 32, "F");
  doc.setTextColor(234, 179, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("REPORTE CONTABLE", margin + 4, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text(`Sucursal: ${SUCURSALES[sucursal]}`, margin + 4, 23);
  doc.text(
    `Descargado: ${fechaDescarga.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`,
    margin + 4,
    29
  );

  const summaryBlocks = [
    { label: "Inventario", value: fmtMoney(valorInventario) },
    { label: "Herramientas / Mobiliario", value: fmtMoney(valorHerramientas) },
    { label: "Total general", value: fmtMoney(totalGeneral) },
  ];

  const blockWidth = (pageW - margin * 2 - 8) / 3;
  summaryBlocks.forEach((block, index) => {
    const x = margin + index * (blockWidth + 4);
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(x, 40, blockWidth, 18, 2, 2, "F");
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, 40, blockWidth, 18, 2, 2, "S");
    doc.setTextColor(180, 180, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(block.label, x + 4, 47);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(8.8);
    doc.text(block.value, x + 4, 54, { maxWidth: blockWidth - 8 });
  });

  y = 70;

  checkPage(16);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("HERRAMIENTAS Y MOBILIARIO", margin, y);
  y += 7;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  if (herramientasSucursal.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No hay herramientas o mobiliario registrados para esta sucursal.", margin, y + 4);
  } else {
    herramientasSucursal.forEach((herramienta) => {
      checkPage(12);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, pageW - margin * 2, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 25, 25);
      doc.text(herramienta.nombre, margin + 2, y + 4.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text(herramienta.categoria, margin + 2, y + 8.2);
      doc.text(herramienta.estado.replace("_", " "), pageW - margin - 38, y + 7.5, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(fmtMoney(herramienta.precio ?? 0), pageW - margin, y + 4.5, { align: "right" });
      y += 12;
    });
  }

  checkPage(30);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("INVENTARIO", margin, y);
  y += 7;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  if (repuestosSucursal.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No hay productos en inventario para esta sucursal.", margin, y + 4);
  } else {
    repuestosSucursal.forEach((repuesto) => {
      checkPage(10);
      const valor = repuesto.existencia * repuesto.precioCompra;
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y, pageW - margin * 2, 9, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(30, 30, 30);
      const nombre = repuesto.nombre.length > 38 ? repuesto.nombre.slice(0, 36) + "…" : repuesto.nombre;
      doc.text(nombre, margin + 2, y + 5.5);
      doc.text(`Stock: ${repuesto.existencia}`, margin + 110, y + 5.5);
      doc.text(fmtMoney(valor), pageW - margin, y + 5.5, { align: "right" });
      y += 10;
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(12, 12, 12);
  doc.text("SUMA TOTAL DEL REPORTE: " + fmtMoney(totalGeneral), margin, pageH - 18);

  const fileName = `reporte_herramientas_mobiliario_${SUCURSALES[sucursal].replace(/\s+/g, "_").toLowerCase()}_${fechaArchivo}.pdf`;
  doc.save(fileName);
}

export default function Herramientas() {
  const { usuarioActual, repuestos, herramientas, agregarHerramienta, editarHerramienta, eliminarHerramienta } = useApp();
  if (!usuarioActual) return null;

  const esGerente = usuarioActual.rol === "gerente";
  const [sucursalTab, setSucursalTab] = useState<Sucursal>(usuarioActual.sucursal);
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<null | { tipo: "nuevo" | "editar"; data: Omit<Herramienta, "id"> & { id?: string } }>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const herrsS = herramientas.filter((h) => h.sucursal === sucursalTab);
  const categorias = ["Todas", ...Array.from(new Set(herrsS.map((h) => h.categoria)))];

  const filtradas = herrsS.filter((h) => {
    const matchE = filtroEstado === "todas" || h.estado === filtroEstado;
    const matchC = filtroCategoria === "Todas" || h.categoria === filtroCategoria;
    const q = busqueda.toLowerCase();
    const matchQ = !q || h.nombre.toLowerCase().includes(q) || h.codigo.toLowerCase().includes(q);
    return matchE && matchC && matchQ;
  });

  const disponibles = herrsS.filter((h) => h.estado === "disponible").length;
  const enUso = herrsS.filter((h) => h.estado === "en_uso").length;
  const enReparacion = herrsS.filter((h) => h.estado === "en_reparacion").length;
  const danados = herrsS.filter((h) => h.estado === "dañado").length;

  const handleSave = (data: Omit<Herramienta, "id"> & { id?: string }) => {
    if (data.estado !== "en_uso") {
      data.asignadoA = undefined;
      data.fechaAsignacion = undefined;
    }
    if (data.id) editarHerramienta(data as Herramienta);
    else {
      const d = { ...data };
      if (!esGerente) d.sucursal = usuarioActual.sucursal;
      agregarHerramienta(d);
    }
    setModal(null);
  };

  const generarPdfContable = () => {
    const sucursalReporte = esGerente ? sucursalTab : usuarioActual.sucursal;
    const herramientasSucursal = herramientas.filter((h) => h.sucursal === sucursalReporte);
    const repuestosSucursal = repuestos.filter((r) => r.sucursal === sucursalReporte);
    generarReporteHerramientasPDF(herramientasSucursal, repuestosSucursal, sucursalReporte);
  };

  const estadoLabels: Record<EstadoFiltro, string> = {
    todas: "Todas",
    disponible: "Disponibles",
    en_uso: "En uso",
    en_reparacion: "En reparación",
    dañado: "Dañado",
  };

  const estadoStyles: Record<EstadoHerramienta, string> = {
    disponible: "bg-[var(--success)]/10 text-[var(--success)]",
    en_uso: "bg-[var(--accent)]/10 text-[var(--accent)]",
    en_reparacion: "bg-amber-500/10 text-amber-500",
    dañado: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {modal && (
        <Modal
          titulo={modal.tipo === "nuevo" ? "Nueva herramienta" : "Editar herramienta"}
          herramienta={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
          esGerente={esGerente}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">Eliminar herramienta</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">¿Confirmas eliminar esta herramienta del registro?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => { eliminarHerramienta(confirmDelete); setConfirmDelete(null); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-2xl text-[var(--foreground)]">Herramientas / Mobiliario</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Control de uso, reparación y valor del inventario</p>
          </div>
          <div className="flex items-center gap-2">
            {esGerente && (
              <button onClick={generarPdfContable} className="btn-secondary flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Descargar PDF
              </button>
            )}

            <button onClick={() => setModal({ tipo: "nuevo", data: { ...EMPTY, sucursal: esGerente ? sucursalTab : usuarioActual.sucursal } })} className="btn-primary flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
              Nueva herramienta
            </button>
          </div>
        </div>

        {esGerente && (
          <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg w-fit mb-5">
            {(["sucursal1", "sucursal2"] as const).map((s) => (
              <button key={s} onClick={() => setSucursalTab(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sucursalTab === s ? "bg-[var(--card)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
                {SUCURSALES[s]}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Total</p>
            <p className="text-2xl font-bold font-mono-data text-[var(--foreground)]">{herrsS.length}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--success)]/20 rounded-xl p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Disponibles</p>
            <p className="text-2xl font-bold font-mono-data text-[var(--success)]">{disponibles}</p>
          </div>
  
          <div className="bg-[var(--card)] border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Reparación</p>
            <p className="text-2xl font-bold font-mono-data text-amber-500">{enReparacion}</p>
          </div>
          <div className="bg-[var(--card)] border border-red-500/20 rounded-xl p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Dañados</p>
            <p className="text-2xl font-bold font-mono-data text-red-400">{danados}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-1 bg-[var(--secondary)] p-1 rounded-lg">
            {ESTADOS_FILTRO.map((e) => (
              <button key={e} onClick={() => setFiltroEstado(e)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filtroEstado === e ? "bg-[var(--card)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                {estadoLabels[e]}
              </button>
            ))}
          </div>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="input-field w-auto">
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="relative flex-1 min-w-48">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar herramienta..." className="input-field pl-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtradas.length === 0 ? (
            <div className="col-span-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center text-sm text-[var(--muted-foreground)]">
              No hay herramientas con esos filtros.
            </div>
          ) : filtradas.map((h) => (
            <div key={h.id} className={`bg-[var(--card)] border rounded-xl p-4 ${h.estado === "disponible" ? "border-[var(--border)]" : h.estado === "en_uso" ? "border-[var(--accent)]/30" : h.estado === "en_reparacion" ? "border-amber-500/30" : "border-red-500/30"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoStyles[h.estado]}`}>
                  {h.estado === "disponible" ? "Disponible" : h.estado === "en_uso" ? "En uso" : h.estado === "en_reparacion" ? "En reparación" : "Dañado"}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ tipo: "editar", data: h })} className="p-1.5 rounded-md hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                  </button>
                  {esGerente && (
                    <button onClick={() => setConfirmDelete(h.id)} className="p-1.5 rounded-md hover:bg-red-950/40 text-[var(--muted-foreground)] hover:text-red-400 transition-colors">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-medium text-[var(--foreground)] text-sm mb-1 leading-tight">{h.nombre}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono-data text-[10px] text-[var(--muted-foreground)]">{h.codigo}</span>
                <span className="text-[var(--border)]">·</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{h.categoria}</span>
              </div>
              {h.estado === "en_uso" && h.fechaAsignacion && (
                <div className="bg-[var(--secondary)] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[var(--muted-foreground)]">Fecha de uso</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">{h.fechaAsignacion}</p>
                </div>
              )}
              {h.precio !== undefined && h.precio > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-md bg-[var(--secondary)] px-2 py-1.5">
                  <span className="text-[10px] text-[var(--muted-foreground)]">Precio</span>
                  <span className="text-[11px] font-semibold text-[var(--foreground)] font-mono-data">${h.precio.toLocaleString("es-MX")}</span>
                </div>
              )}
              {h.notas && (
                <p className="text-[10px] text-[var(--muted-foreground)] mt-2 italic">{h.notas}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
