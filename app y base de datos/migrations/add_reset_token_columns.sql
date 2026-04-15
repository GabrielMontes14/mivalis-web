-- Add reset token columns to customers table
-- This allows password reset functionality

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN customers.reset_token IS 'Token for password reset verification';
COMMENT ON COLUMN customers.reset_token_expires IS 'Expiration datetime for reset token';
