-- Add invoice_seal_image_url column to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invoice_seal_image_url TEXT;
