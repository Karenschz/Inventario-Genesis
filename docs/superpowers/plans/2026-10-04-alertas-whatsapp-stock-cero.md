# Implementación: Alertas de WhatsApp al Agotar Stock (Stock Cero)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el envío automático de alertas por WhatsApp cuando el stock de un repuesto llegue a cero tras una venta o salida en el sistema de inventario Génesis, usando una instancia de WhatsApp conectada vía QR (UltraMsg), con panel de configuración de credenciales y script SQL de trigger para Supabase/PostgreSQL.

**Architecture:** Módulo de servicio de WhatsApp (`whatsappService.ts`) que interactúa con la API de UltraMsg para números personales o grupos. Hook/integración en el contexto de inventario (`context.tsx`) que detecta la transición a stock cero (`stockAnterior > 0 && stockResultante <= 0`) y dispara la alerta en segundo plano. Interfaz de usuario con botón en el header y modal de configuración con prueba en vivo. Script de disparador SQL para PostgreSQL/Supabase.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4, Supabase JS, UltraMsg REST API, PostgreSQL / PL-pgSQL.

**Spec:** [`docs/superpowers/specs/2026-10-04-alertas-whatsapp-stock-cero-design.md`](file:///Users/miguel/Downloads/sistema-inventario-genesis-main/docs/superpowers/specs/2026-10-04-alertas-whatsapp-stock-cero-design.md)

## Global Constraints

- Vite 8 + React 19 + Tailwind CSS v4.
- No romper las transacciones ni el flujo de inventario si el servicio de WhatsApp o la conexión a internet fallan.
- Mantener compatibilidad con modo Supabase y modo local (demo sin credenciales).
- Exportar componentes como default exports cuando corresponda según `AGENTS.md`.

---

### Task 1: Tipos de Datos para WhatsApp

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `WhatsAppConfig`, `WhatsAppNotificationPayload`, `WhatsAppSendResult`.

- [ ] **Step 1: Definir los tipos de configuración y payload en `src/types.ts`**

Agregar las interfaces:
```typescript
export interface WhatsAppConfig {
  activo: boolean;
  instanceId: string;
  token: string;
  tipoDestinatario: "individual" | "grupo";
  destinatario: string; // Número con código de país o ID de grupo (...@g.us)
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
```

- [ ] **Step 2: Verificar compilación TypeScript**

Ejecutar: `npm run build`
Esperado: Sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add whatsapp config and notification types"
```

---

### Task 2: Servicio de WhatsApp (`src/lib/whatsappService.ts`)

**Files:**
- Create: `src/lib/whatsappService.ts`

**Interfaces:**
- Consumes: `WhatsAppConfig`, `WhatsAppNotificationPayload`, `WhatsAppSendResult` de `src/types.ts`.
- Produces: `getWhatsAppConfig()`, `saveWhatsAppConfig()`, `enviarMensajeWhatsApp()`, `enviarAlertaStockCero()`, `probarConexionWhatsApp()`.

- [ ] **Step 1: Crear `src/lib/whatsappService.ts`**

Implementar funciones para:
1. Cargar y guardar configuración en `localStorage` con fallback a `.env` (`VITE_WHATSAPP_INSTANCE_ID`, `VITE_WHATSAPP_TOKEN`, etc.).
2. `sanitizarDestinatario(destinatario, tipo)`: limpiar caracteres no numéricos para teléfonos y preservar sufijos `@g.us` para grupos.
3. `enviarMensajeWhatsApp(to, body, configOverride?)`: llamada `fetch` a `https://api.ultramsg.com/{instanceId}/messages/chat`.
4. `enviarAlertaStockCero(payload)`: formatear la plantilla de alerta con emojis y llamar a `enviarMensajeWhatsApp`.
5. `probarConexionWhatsApp(configOverride?)`: enviar mensaje de prueba y retornar resultado.

- [ ] **Step 2: Verificar compilación**

Ejecutar: `npm run build`
Esperado: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/whatsappService.ts
git commit -m "feat(whatsapp): implement whatsapp service with ultramsg api"
```

---

### Task 3: Modal de Configuración de WhatsApp (`src/components/ModalConfigWhatsApp.tsx`)

**Files:**
- Create: `src/components/ModalConfigWhatsApp.tsx`

**Interfaces:**
- Consumes: `WhatsAppConfig` de `src/types.ts`, `saveWhatsAppConfig`, `probarConexionWhatsApp` de `src/lib/whatsappService.ts`.
- Produces: Componente `<ModalConfigWhatsApp isOpen={isOpen} onClose={onClose} onSave={onSave} />`.

- [ ] **Step 1: Crear el componente `ModalConfigWhatsApp`**

Incluir:
- Interruptor para activar/desactivar alertas.
- Inputs para `instanceId` y `token`.
- Enlace instructivo para escanear el QR en UltraMsg.
- Selector de tipo de destinatario (Individual vs Grupo).
- Input con placeholder contextual y validación.
- Checkbox opcional "Alertar también cuando alcance el stock mínimo".
- Botón "Enviar mensaje de prueba" con estado de carga y banner de resultado (éxito con check verde o error con descripción).
- Botones "Cancelar" y "Guardar Configuración".

- [ ] **Step 2: Verificar compilación**

Ejecutar: `npm run build`
Esperado: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ModalConfigWhatsApp.tsx
git commit -m "feat(ui): add whatsapp settings modal with live test"
```

---

### Task 4: Integración en `src/context.tsx` y Detección de Stock Cero

**Files:**
- Modify: `src/context.tsx`

**Interfaces:**
- Consumes: `enviarAlertaStockCero`, `getWhatsAppConfig`, `saveWhatsAppConfig` de `src/lib/whatsappService.ts`.
- Produces: `whatsAppConfig` y `setWhatsAppConfig` en `AppContextType`, disparo de alerta en `registrarMovimiento`.

- [ ] **Step 1: Actualizar `src/context.tsx`**

1. Cargar el estado inicial de `whatsAppConfig`.
2. En `registrarMovimiento`:
   - Evaluar si `tipo === "salida"` y `stockAnterior > 0 && nuevoStock <= 0`.
   - Si se cumple la condición, invocar en segundo plano (promesa sin `await` bloqueante):
     ```typescript
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
     }).then((res) => {
       if (res.ok) {
         setToast({
           tipo: "exito",
           mensaje: `⚠️ Stock agotado: Alerta enviada a WhatsApp para "${rep.nombre}"`,
         });
       }
     }).catch((err) => console.warn("Error enviando alerta WhatsApp:", err));
     ```
3. Exponer `whatsAppConfig` y `actualizarWhatsAppConfig` a través de `useApp()`.

- [ ] **Step 2: Verificar compilación**

Ejecutar: `npm run build`
Esperado: PASS

- [ ] **Step 3: Commit**

```bash
git add src/context.tsx
git commit -m "feat(inventory): trigger whatsapp alert when stock reaches zero"
```

---

### Task 5: Acceso en Header de `src/components/Layout.tsx`

**Files:**
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `whatsAppConfig` y `actualizarWhatsAppConfig` de `useApp()`, `<ModalConfigWhatsApp />`.

- [ ] **Step 1: Agregar botón de WhatsApp en la barra superior de `Layout.tsx`**

1. Importar `ModalConfigWhatsApp`.
2. Agregar botón estilizado con el logo/icono de WhatsApp en la barra de navegación superior.
3. Mostrar un punto de estado:
   - Verde si `whatsAppConfig.activo && whatsAppConfig.instanceId && whatsAppConfig.token`.
   - Ámbar/Gris si está inactivo o sin configurar.
4. Renderizar el modal `ModalConfigWhatsApp` controlado por estado `isModalWhatsAppOpen`.

- [ ] **Step 2: Verificar compilación**

Ejecutar: `npm run build`
Esperado: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(ui): add whatsapp button and modal trigger to layout header"
```

---

### Task 6: Script de Disparador SQL para Supabase / PostgreSQL

**Files:**
- Create: `docs/triggers/whatsapp_stock_cero.sql`

**Interfaces:**
- Base de datos Supabase / PostgreSQL: tabla `inventario_repuestos`.

- [ ] **Step 1: Crear `docs/triggers/whatsapp_stock_cero.sql`**

Escribir el script SQL documentado que:
1. Habilita la extensión `pg_net` (`CREATE EXTENSION IF NOT EXISTS pg_net;`).
2. Define la función `notificar_stock_cero_whatsapp()` que evalúa `OLD.existencia > 0 AND NEW.existencia = 0`.
3. Realiza la llamada HTTP POST a UltraMsg mediante `net.http_post`.
4. Crea el Trigger `AFTER UPDATE OF existencia ON inventario_repuestos`.
5. Incluye instrucciones de cómo configurarlo en el SQL Editor de Supabase.

- [ ] **Step 2: Commit**

```bash
git add docs/triggers/whatsapp_stock_cero.sql
git commit -m "docs(sql): add postgresql trigger for direct database stock zero alert"
```

---

### Task 7: Verificación Integral

**Files:**
- Verification in dev environment and type-check.

- [ ] **Step 1: Ejecutar verificación de build y sintaxis**

Ejecutar: `npm run build`
Esperado: 0 errores de build.

- [ ] **Step 2: Probar la interfaz en el navegador**

- [ ] **Step 3: Documentar instrucciones finales para el usuario**
