-- =================================================================================
-- TABLA: user_diet_plans
-- DESCRIPCIÓN: Almacena la planificación nutricional semanal por usuario
-- =================================================================================

-- 1. Crear la tabla (asegurándonos de no romper si ya existiera algo parecido)
CREATE TABLE IF NOT EXISTS public.user_diet_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    active boolean DEFAULT true,
    weekly_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.user_diet_plans ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de acceso:
-- El usuario solo puede leer su propio plan
CREATE POLICY "Users can view their own diet plan"
    ON public.user_diet_plans FOR SELECT
    USING (auth.uid() = user_id);

-- El usuario solo puede insertar su propio plan
CREATE POLICY "Users can insert their own diet plan"
    ON public.user_diet_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- El usuario solo puede actualizar su propio plan
CREATE POLICY "Users can update their own diet plan"
    ON public.user_diet_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Trigger para actualizar el 'updated_at' automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_diet_plans_updated_at ON public.user_diet_plans;

CREATE TRIGGER update_user_diet_plans_updated_at
    BEFORE UPDATE ON public.user_diet_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
