-- Add customer_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add foreign key constraint (optional, if customers table exists)
-- ALTER TABLE profiles ADD CONSTRAINT fk_profiles_customer 
--   FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.customer_id IS 'Link to customer record if this profile is associated with a customer';
