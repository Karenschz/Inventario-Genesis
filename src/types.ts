export type Rol = "gerente" | "vendedor";
export type Sucursal = "sucursal1" | "sucursal2";
export type EstadoHerramienta = "disponible" | "en_uso" | "en_reparacion" | "dañado";
export type CategoriaRepuesto =
  | "Motor"
  | "Transmisión"
  | "Frenos"
  | "Suspensión"
  | "Eléctrico"
  | "Carrocería"
  | "Filtros"
  | "Lubricantes"
  | "Neumáticos"
  | "Otro";

export type CategoriaHerramienta =
  | "Herramienta manual"
  | "Herramienta eléctrica"
  | "Diagnóstico"
  | "Elevación"
  | "Medición"
  | "Mobiliario"
  | "Otro";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  sucursal: Sucursal;
  activo: boolean;
  passwordTemporal?: boolean;
}

export type ProveedorEmail = "resend" | "emailjs" | "webhook" | "simulado";

export interface EmailConfig {
  activo: boolean;
  proveedor: ProveedorEmail;
  resendApiKey?: string;
  resendFromEmail?: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  webhookUrl?: string;
}

export interface PasswordRecoveryResult {
  ok: boolean;
  error?: string;
  emailEnviado?: boolean;
  passwordTemporal?: string;
  proveedor?: string;
  destinatario?: string;
  mensaje?: string;
}

export interface Repuesto {
  id: string;
  nombre: string;
  codigo: string;
  categoria: CategoriaRepuesto;
  marca: string;
  sucursal: Sucursal;
  existencia: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  proveedor: string;
  ubicacion: string;
  fechaUltimaCompra: string;
}

export interface Herramienta {
  id: string;
  nombre: string;
  codigo: string;
  categoria: CategoriaHerramienta;
  sucursal: Sucursal;
  estado: EstadoHerramienta;
  precio?: number;
  asignadoA?: string;
  fechaAsignacion?: string;
  notas?: string;
}

export type TipoMovimiento = "entrada" | "salida" | "ajuste";
export type MotivoMovimiento =
  | "Venta al mostrador"
  | "Uso en taller / Reparación"
  | "Traspaso de sucursal"
  | "Compra de proveedor"
  | "Devolución"
  | "Ajuste de inventario"
  | "Merma o daño";

export interface MovimientoInventario {
  id: string;
  repuestoId: string;
  repuestoNombre: string;
  repuestoCodigo: string;
  sucursal: Sucursal;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: MotivoMovimiento | string;
  folioReferencia?: string;
  fecha: string;
  usuarioId: string;
  usuarioNombre: string;
  notas?: string;
}

export interface WhatsAppConfig {
  activo: boolean;
  tipoDestinatario: "individual" | "grupo";
  destinatario: string; // Número internacional (ej: 50212345678) o Group ID (ej: 1203630...@g.us)
  notificarStockMinimo?: boolean;
}

export interface WhatsAppNotificationPayload {
  repuestoNombre: string;
  repuestoCodigo: string;
  sucursal: Sucursal;
  cantidadSalida: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: string;
  folioReferencia?: string;
  usuarioNombre: string;
  fecha: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}
