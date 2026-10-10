import type { Usuario, Repuesto, Herramienta, MovimientoInventario, MotivoMovimiento } from "./types";


export const usuariosIniciales: Usuario[] = [
  {
    id: "1",
    nombre: "Ever leonel",
    email: "gerente@taller.com",
    password: "gerente123",
    rol: "gerente",
    sucursal: "sucursal1",
    activo: true,
  },
];

export const repuestosIniciales: Repuesto[] = [
  // Sucursal 1
  {
    id: "r1", nombre: "Filtro de aceite Toyota Corolla", codigo: "FAC-001",
    categoria: "Filtros", marca: "Toyota", sucursal: "sucursal1",
    existencia: 24, stockMinimo: 10, precioCompra: 85, precioVenta: 140,
    proveedor: "Distribuidora Toyota MX", ubicacion: "A1-E2", fechaUltimaCompra: "2026-07-15",
  },
  {
    id: "r2", nombre: "Pastillas de freno delanteras Nissan", codigo: "PFD-012",
    categoria: "Frenos", marca: "Brembo", sucursal: "sucursal1",
    existencia: 4, stockMinimo: 6, precioCompra: 320, precioVenta: 550,
    proveedor: "AutoPartes Norte", ubicacion: "B2-E1", fechaUltimaCompra: "2026-06-20",
  },
  {
    id: "r3", nombre: "Aceite motor 5W-30 sintético 1L", codigo: "ACM-030",
    categoria: "Lubricantes", marca: "Mobil 1", sucursal: "sucursal1",
    existencia: 48, stockMinimo: 20, precioCompra: 95, precioVenta: 165,
    proveedor: "Lubricantes MX", ubicacion: "C1-E3", fechaUltimaCompra: "2026-08-01",
  },
  {
    id: "r4", nombre: "Amortiguador delantero Honda Civic", codigo: "AMD-024",
    categoria: "Suspensión", marca: "Monroe", sucursal: "sucursal1",
    existencia: 2, stockMinimo: 4, precioCompra: 780, precioVenta: 1350,
    proveedor: "Refacciones Premium", ubicacion: "D3-E1", fechaUltimaCompra: "2026-05-10",
  },
  {
    id: "r5", nombre: "Batería 12V 60Ah", codigo: "BAT-060",
    categoria: "Eléctrico", marca: "Optima", sucursal: "sucursal1",
    existencia: 8, stockMinimo: 5, precioCompra: 1200, precioVenta: 1950,
    proveedor: "ElectroCar SA", ubicacion: "E1-E2", fechaUltimaCompra: "2026-07-28",
  },
  {
    id: "r6", nombre: "Bujías NGK Platino x4", codigo: "BUJ-NGK",
    categoria: "Motor", marca: "NGK", sucursal: "sucursal1",
    existencia: 0, stockMinimo: 8, precioCompra: 210, precioVenta: 380,
    proveedor: "AutoPartes Norte", ubicacion: "A2-E1", fechaUltimaCompra: "2026-04-15",
  },
  {
    id: "r7", nombre: "Filtro de aire KN High Flow", codigo: "FAI-KN1",
    categoria: "Filtros", marca: "K&N", sucursal: "sucursal1",
    existencia: 6, stockMinimo: 4, precioCompra: 450, precioVenta: 780,
    proveedor: "Rendimiento Total", ubicacion: "A1-E3", fechaUltimaCompra: "2026-08-10",
  },
  {
    id: "r8", nombre: "Cable de bujía universal", codigo: "CBU-UNI",
    categoria: "Eléctrico", marca: "Bosch", sucursal: "sucursal1",
    existencia: 11, stockMinimo: 5, precioCompra: 180, precioVenta: 320,
    proveedor: "ElectroCar SA", ubicacion: "E2-E1", fechaUltimaCompra: "2026-06-05",
  },
  // Sucursal 2
  {
    id: "r9", nombre: "Filtro de aceite Volkswagen", codigo: "FAC-VW1",
    categoria: "Filtros", marca: "Mann", sucursal: "sucursal2",
    existencia: 15, stockMinimo: 8, precioCompra: 90, precioVenta: 155,
    proveedor: "Distribuidora VW MX", ubicacion: "A1-E1", fechaUltimaCompra: "2026-07-20",
  },
  {
    id: "r10", nombre: "Disco de freno trasero Ford", codigo: "DFT-003",
    categoria: "Frenos", marca: "TRW", sucursal: "sucursal2",
    existencia: 3, stockMinimo: 4, precioCompra: 420, precioVenta: 720,
    proveedor: "RefaccionesFord Sur", ubicacion: "B1-E2", fechaUltimaCompra: "2026-06-10",
  },
  {
    id: "r11", nombre: "Aceite motor 0W-20 full sintético 1L", codigo: "ACM-020",
    categoria: "Lubricantes", marca: "Castrol Edge", sucursal: "sucursal2",
    existencia: 35, stockMinimo: 15, precioCompra: 115, precioVenta: 195,
    proveedor: "Lubricantes MX", ubicacion: "C1-E1", fechaUltimaCompra: "2026-08-05",
  },
  {
    id: "r12", nombre: "Correa de distribución Chevrolet", codigo: "CDI-CHV",
    categoria: "Motor", marca: "Gates", sucursal: "sucursal2",
    existencia: 5, stockMinimo: 3, precioCompra: 380, precioVenta: 680,
    proveedor: "Motores y Más", ubicacion: "D1-E1", fechaUltimaCompra: "2026-07-01",
  },
  {
    id: "r13", nombre: "Sensor MAP universal", codigo: "SEN-MAP",
    categoria: "Eléctrico", marca: "Delphi", sucursal: "sucursal2",
    existencia: 2, stockMinimo: 3, precioCompra: 550, precioVenta: 950,
    proveedor: "ElectroCar SA", ubicacion: "E1-E1", fechaUltimaCompra: "2026-05-25",
  },
  {
    id: "r14", nombre: "Terminal de batería universal", codigo: "TBA-UNI",
    categoria: "Eléctrico", marca: "Genérico", sucursal: "sucursal2",
    existencia: 0, stockMinimo: 6, precioCompra: 45, precioVenta: 85,
    proveedor: "ElectroCar SA", ubicacion: "E2-E2", fechaUltimaCompra: "2026-03-10",
  },
  {
    id: "r15", nombre: "Llanta Michelin 195/65 R15", codigo: "LLA-MIC",
    categoria: "Neumáticos", marca: "Michelin", sucursal: "sucursal2",
    existencia: 8, stockMinimo: 4, precioCompra: 1650, precioVenta: 2400,
    proveedor: "Llantas del Sur", ubicacion: "F1-E1", fechaUltimaCompra: "2026-08-12",
  },
  {
    id: "r16", nombre: "Retén de cigüeñal trasero", codigo: "RCI-TRA",
    categoria: "Motor", marca: "Corteco", sucursal: "sucursal2",
    existencia: 1, stockMinimo: 3, precioCompra: 220, precioVenta: 390,
    proveedor: "Motores y Más", ubicacion: "D2-E1", fechaUltimaCompra: "2026-04-30",
  },
];

export const herramientasIniciales: Herramienta[] = [
  // Sucursal 1
  {
    id: "h1", nombre: "Llave de impacto neumática 1/2\"", codigo: "LIM-001",
    categoria: "Herramienta eléctrica", sucursal: "sucursal1", estado: "disponible",
  },
  {
    id: "h2", nombre: "Gato hidráulico 3 toneladas", codigo: "GHI-003",
    categoria: "Elevación", sucursal: "sucursal1", estado: "en_uso",
    asignadoA: "Mecánico Juan Torres", fechaAsignacion: "2026-08-27",
  },
  {
    id: "h3", nombre: "Scanner diagnóstico OBD2 Launch X431", codigo: "SCA-LX4",
    categoria: "Diagnóstico", sucursal: "sucursal1", estado: "en_uso",
    asignadoA: "Mecánico Pedro Ruiz", fechaAsignacion: "2026-08-26",
  },
  {
    id: "h4", nombre: "Juego de llaves Allen métrico", codigo: "JLA-MET",
    categoria: "Herramienta manual", sucursal: "sucursal1", estado: "disponible",
  },
  {
    id: "h5", nombre: "Torquímetro 20-200 Nm", codigo: "TOR-200",
    categoria: "Medición", sucursal: "sucursal1", estado: "disponible",
  },
  {
    id: "h6", nombre: "Elevador columna 4 toneladas", codigo: "ELE-4TN",
    categoria: "Elevación", sucursal: "sucursal1", estado: "en_uso",
    asignadoA: "Bahía 3", fechaAsignacion: "2026-08-27",
  },
  {
    id: "h7", nombre: "Pulidora orbital eléctrica", codigo: "PUL-ORB",
    categoria: "Herramienta eléctrica", sucursal: "sucursal1", estado: "disponible",
  },
  {
    id: "h8", nombre: "Multímetro digital Fluke", codigo: "MUL-FLK",
    categoria: "Medición", sucursal: "sucursal1", estado: "disponible",
  },
  {
    id: "h8b", nombre: "Mesa de trabajo metálica", codigo: "MES-001",
    categoria: "Mobiliario", sucursal: "sucursal1", estado: "disponible", precio: 3200,
  },
  // Sucursal 2
  {
    id: "h9", nombre: "Llave de impacto eléctrica 3/8\"", codigo: "LIE-038",
    categoria: "Herramienta eléctrica", sucursal: "sucursal2", estado: "disponible",
  },
  {
    id: "h10", nombre: "Scanner diagnóstico Autel MaxiSys", codigo: "SCA-AUT",
    categoria: "Diagnóstico", sucursal: "sucursal2", estado: "disponible",
  },
  {
    id: "h11", nombre: "Gato de tijera 2 toneladas", codigo: "GTI-002",
    categoria: "Elevación", sucursal: "sucursal2", estado: "en_uso",
    asignadoA: "Mecánico Luis Vargas", fechaAsignacion: "2026-08-27",
  },
  {
    id: "h12", nombre: "Juego de llaves combinadas 8-32mm", codigo: "JLC-832",
    categoria: "Herramienta manual", sucursal: "sucursal2", estado: "disponible",
  },
  {
    id: "h13", nombre: "Calibrador vernier digital 150mm", codigo: "CAV-150",
    categoria: "Medición", sucursal: "sucursal2", estado: "en_uso",
    asignadoA: "Mecánico Carlos Reyes", fechaAsignacion: "2026-08-25",
  },
  {
    id: "h14", nombre: "Compresor de aire 50L 2HP", codigo: "COM-50L",
    categoria: "Herramienta eléctrica", sucursal: "sucursal2", estado: "disponible",
  },
  {
    id: "h15", nombre: "Silla de oficina para taller", codigo: "SIL-010",
    categoria: "Mobiliario", sucursal: "sucursal2", estado: "en_reparacion", precio: 1850,
  },
];

export const SUCURSALES = {
  sucursal1: "Sucursal Norte",
  sucursal2: "Sucursal Sur",
};

export const CATEGORIAS_REPUESTO = [
  "Motor", "Transmisión", "Frenos", "Suspensión",
  "Eléctrico", "Carrocería", "Filtros", "Lubricantes", "Neumáticos", "Otro",
];

export const CATEGORIAS_HERRAMIENTA = [
  "Herramienta manual", "Herramienta eléctrica", "Diagnóstico",
  "Elevación", "Medición", "Mobiliario", "Otro",
];

export const MOTIVOS_SALIDA: MotivoMovimiento[] = [
  "Venta al mostrador",
  "Uso en taller / Reparación",
  "Traspaso de sucursal",
  "Merma o daño",
  "Ajuste de inventario",
];

export const MOTIVOS_ENTRADA: MotivoMovimiento[] = [
  "Compra de proveedor",
  "Devolución",
  "Traspaso de sucursal",
  "Ajuste de inventario",
];

export const movimientosIniciales: MovimientoInventario[] = [
  {
    id: "m1",
    repuestoId: "r1",
    repuestoNombre: "Filtro de aceite Toyota Corolla",
    repuestoCodigo: "FAC-001",
    sucursal: "sucursal1",
    tipo: "entrada",
    cantidad: 20,
    stockAnterior: 4,
    stockResultante: 24,
    motivo: "Compra de proveedor",
    folioReferencia: "FAC-2026-883",
    fecha: "2026-08-28 14:30",
    usuarioId: "u1",
    usuarioNombre: "Ever leonel",
    notas: "Recepción de pedido semanal",
  },
  {
    id: "m2",
    repuestoId: "r1",
    repuestoNombre: "Filtro de aceite Toyota Corolla",
    repuestoCodigo: "FAC-001",
    sucursal: "sucursal1",
    tipo: "salida",
    cantidad: 2,
    stockAnterior: 26,
    stockResultante: 24,
    motivo: "Venta al mostrador",
    folioReferencia: "TKT-10492",
    fecha: "2026-08-28 16:15",
    usuarioId: "u2",
    usuarioNombre: "Ana García",
    notas: "Venta a cliente mostrador",
  },
  {
    id: "m3",
    repuestoId: "r3",
    repuestoNombre: "Aceite motor 5W-30 sintético 1L",
    repuestoCodigo: "ACM-030",
    sucursal: "sucursal1",
    tipo: "salida",
    cantidad: 4,
    stockAnterior: 52,
    stockResultante: 48,
    motivo: "Uso en taller / Reparación",
    folioReferencia: "ORD-5501",
    fecha: "2026-08-28 11:20",
    usuarioId: "u2",
    usuarioNombre: "Ana García",
    notas: "Servicio de afinación mayor Civic",
  },
  {
    id: "m4",
    repuestoId: "r9",
    repuestoNombre: "Filtro de aceite Volkswagen",
    repuestoCodigo: "FAC-VW1",
    sucursal: "sucursal2",
    tipo: "salida",
    cantidad: 1,
    stockAnterior: 16,
    stockResultante: 15,
    motivo: "Venta al mostrador",
    folioReferencia: "TKT-20381",
    fecha: "2026-08-28 15:45",
    usuarioId: "u3",
    usuarioNombre: "Roberto Díaz",
    notas: "Venta rápida",
  },
];

