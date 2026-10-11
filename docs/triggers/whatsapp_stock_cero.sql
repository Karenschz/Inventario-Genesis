-- ==============================================================================
-- DISPARADOR SQL PARA ALERTAS DE WHATSAPP AL AGOTAR STOCK (STOCK CERO)
-- Base de Datos: PostgreSQL / Supabase
-- Tabla auditada: inventario_repuestos
-- ==============================================================================
-- Este script permite que la propia base de datos (PostgreSQL en Supabase)
-- envíe de forma 100% autónoma un mensaje a WhatsApp a través de la API de UltraMsg
-- cada vez que la columna "existencia" pase de ser mayor a cero (> 0) a cero (<= 0),
-- incluso si la actualización ocurre por fuera de la aplicación web (ej. API, script o consola SQL).

-- PASO 1: Habilitar la extensión de peticiones HTTP en segundo plano (pg_net)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- PASO 2: (Opcional recomendado) Crear tabla de configuración de WhatsApp en la base de datos
CREATE TABLE IF NOT EXISTS public.configuracion_whatsapp (
    id SERIAL PRIMARY KEY,
    activo BOOLEAN DEFAULT true,
    instance_id TEXT NOT NULL,       -- ej: 'instance12345'
    token TEXT NOT NULL,             -- Token de UltraMsg
    destinatario TEXT NOT NULL,      -- Número ej: '50212345678' o ID de grupo ej: '1203630...@g.us'
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- Si no existe ningún registro, puedes insertar tus datos (reemplazar con tus credenciales):
-- INSERT INTO public.configuracion_whatsapp (activo, instance_id, token, destinatario)
-- VALUES (true, 'instanceXXXXX', 'tu_token_aqui', '50212345678')
-- ON CONFLICT DO NOTHING;

-- PASO 3: Función que detecta el stock en cero y llama a UltraMsg
CREATE OR REPLACE FUNCTION public.notificar_stock_cero_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
    v_config RECORD;
    v_repuesto_nombre TEXT := 'Repuesto Desconocido';
    v_repuesto_codigo TEXT := 'N/A';
    v_sucursal_nombre TEXT := 'Sucursal Central';
    v_mensaje TEXT;
    v_url TEXT;
    v_payload JSONB;
BEGIN
    -- 1. Verificar si la existencia pasó de > 0 a <= 0
    IF (OLD.existencia > 0 AND NEW.existencia <= 0) THEN

        -- 2. Consultar configuración activa de WhatsApp
        SELECT * INTO v_config
        FROM public.configuracion_whatsapp
        WHERE activo = true
        ORDER BY id DESC
        LIMIT 1;

        -- Si no hay configuración activa o no tiene credenciales, salir silenciosamente
        IF NOT FOUND OR v_config.instance_id IS NULL OR v_config.token IS NULL THEN
            RETURN NEW;
        END IF;

        -- 3. Obtener información del repuesto desde la tabla maestra "repuestos"
        BEGIN
            SELECT r.nombre, r.codigo_parte INTO v_repuesto_nombre, v_repuesto_codigo
            FROM public.repuestos r
            WHERE r.id = NEW.repuesto_id
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_repuesto_nombre := 'Repuesto #' || COALESCE(NEW.repuesto_id::text, 'S/N');
        END;

        -- 4. Obtener nombre de la sucursal
        IF NEW.sucursal_id = 1 THEN
            v_sucursal_nombre := 'Sucursal 1 - Central';
        ELSIF NEW.sucursal_id = 2 THEN
            v_sucursal_nombre := 'Sucursal 2 - Norte';
        ELSE
            v_sucursal_nombre := 'Sucursal #' || COALESCE(NEW.sucursal_id::text, '');
        END IF;

        -- 5. Redactar el cuerpo del mensaje para WhatsApp
        v_mensaje := E'🚨 *¡ALERTA DE STOCK AGOTADO (POSTGRESQL)!* 🚨\n' ||
                     E'━━━━━━━━━━━━━━━━━━━━━━\n' ||
                     E'📦 *Producto:* ' || COALESCE(v_repuesto_nombre, 'N/A') || E'\n' ||
                     E'🏷️ *Código:* ' || COALESCE(v_repuesto_codigo, 'N/A') || E'\n' ||
                     E'🏢 *Sucursal:* ' || v_sucursal_nombre || E'\n' ||
                     E'📉 *Stock anterior:* ' || OLD.existencia::text || E' unidades\n' ||
                     E'📉 *Stock resultante:* 0 unidades (Agotado)\n' ||
                     E'⏰ *Fecha:* ' || to_char(now() AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD HH24:MI:SS') || E'\n' ||
                     E'━━━━━━━━━━━━━━━━━━━━━━\n' ||
                     E'⚠️ *Acción:* Inventario en cero. Se requiere reabastecimiento.';

        -- 6. Construir URL de UltraMsg
        v_url := 'https://api.ultramsg.com/' || replace(v_config.instance_id, 'instance', 'instance') || '/messages/chat';

        -- 7. Enviar la petición HTTP asíncrona mediante pg_net
        PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/x-www-form-urlencoded'
            ),
            body := 'token=' || urlencode(v_config.token) ||
                    '&to=' || urlencode(v_config.destinatario) ||
                    '&body=' || urlencode(v_mensaje) ||
                    '&priority=10'
        );

    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Ante cualquier error de red o función, no bloquear la transacción de la base de datos
    RAISE WARNING 'Error al disparar alerta de WhatsApp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: Vincular el disparador a la tabla "inventario_repuestos"
DROP TRIGGER IF EXISTS trg_stock_cero_whatsapp ON public.inventario_repuestos;

CREATE TRIGGER trg_stock_cero_whatsapp
AFTER UPDATE OF existencia ON public.inventario_repuestos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_stock_cero_whatsapp();

-- ==============================================================================
-- INSTRUCCIONES DE USO:
-- 1. Ve a tu panel de Supabase > "SQL Editor" > "New Query".
-- 2. Pega y ejecuta este script.
-- 3. Inserta tu fila de configuración:
--    INSERT INTO public.configuracion_whatsapp (activo, instance_id, token, destinatario)
--    VALUES (true, 'instance12345', 'tu_token_aqui', '50212345678');
-- 4. Para probarlo, actualiza un repuesto a 0:
--    UPDATE public.inventario_repuestos SET existencia = 0 WHERE id = 1;
-- 5. ¡Listo! Recibirás la notificación en tu WhatsApp automáticamente.
-- ==============================================================================
