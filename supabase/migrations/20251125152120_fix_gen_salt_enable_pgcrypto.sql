-- Enable pgcrypto extension for gen_salt() function used in PIN hashing
-- This fixes: "function gen_salt(unknown) does not exist" error when creating operators

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the create_operator_with_pin function to properly use pgcrypto
-- The function creates an operator in the profiles table with a hashed PIN
CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
    p_full_name TEXT,
    p_employee_id TEXT,
    p_pin TEXT,
    p_role public.app_role DEFAULT 'operator',
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_operator_id UUID;
    v_tenant_id UUID;
    v_username TEXT;
    v_email TEXT;
BEGIN
    -- Get tenant_id from calling user if not provided
    IF p_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.profiles
        WHERE id = auth.uid();

        IF v_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Could not determine tenant_id';
        END IF;
    ELSE
        v_tenant_id := p_tenant_id;
    END IF;

    -- Generate a new UUID for the operator
    v_operator_id := gen_random_uuid();

    -- Generate username from employee_id
    v_username := LOWER(REPLACE(p_employee_id, ' ', '_'));

    -- Generate a placeholder email (operators don't use email login)
    v_email := v_username || '@operator.local';

    -- Insert the operator into profiles with hashed PIN
    INSERT INTO public.profiles (
        id,
        tenant_id,
        username,
        full_name,
        email,
        role,
        employee_id,
        pin_hash,
        has_email_login,
        active
    ) VALUES (
        v_operator_id,
        v_tenant_id,
        v_username,
        p_full_name,
        v_email,
        p_role,
        p_employee_id,
        extensions.crypt(p_pin, extensions.gen_salt('bf')),
        false,
        true
    );

    RETURN v_operator_id::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin(TEXT, TEXT, TEXT, public.app_role, UUID) TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION public.create_operator_with_pin IS 'Creates an operator profile with PIN-based authentication (no email login required). PIN is hashed using bcrypt via pgcrypto.';
