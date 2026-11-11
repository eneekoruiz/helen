-- Create user_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own push subscription"
    ON public.user_push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscription"
    ON public.user_push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscription"
    ON public.user_push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscription"
    ON public.user_push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- Optional: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_push_subscriptions_updated_at
    BEFORE UPDATE ON public.user_push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
