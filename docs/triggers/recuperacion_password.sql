-- ==============================================================================
-- MÓDULO DE RECUPERACIÓN DE CONTRASEÑA - GENESIS INVENTARIO
-- Base de Datos: PostgreSQL / Supabase
-- ==============================================================================
-- Este script prepara la base de datos de Supabase para soportar el módulo de
-- contraseñas temporales y recuperación de accesos para vendedores y gerentes.

-- 1. Agregar la columna "password_temporal" en la tabla "usuarios"
-- Permite saber si el usuario debe cambiar su contraseña obligatoriamente al iniciar sesión.
ALTER TABLE IF EXISTS public.usuarios 
ADD COLUMN IF NOT EXISTS password_temporal BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower 
ON public.usuarios (LOWER(email));

CREATE TABLE IF NOT EXISTS public.auditoria_recuperaciones_password (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    creado_el TIMESTAMPTZ DEFAULT now(),
    ip_origen TEXT,
    completado BOOLEAN DEFAULT false
);

COMMENT ON COLUMN public.usuarios.password_temporal IS 'Indica si la contraseña actual del usuario fue generada de manera temporal y debe cambiarse en el próximo inicio de sesión';
