-- Create the new enum type for verification status (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE public.verification_status AS ENUM ('verified', 'unverified', 'rejected');
    END IF;
END $$;

-- Add the new column to the customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS verification_status public.verification_status DEFAULT 'unverified' NOT NULL;

-- Add a comment to the new column
COMMENT ON COLUMN public.customers.verification_status IS '人工驗證狀態';
