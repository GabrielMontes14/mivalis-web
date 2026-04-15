-- Add role column to customers table
ALTER TABLE customers ADD COLUMN role VARCHAR(20) DEFAULT 'retail';
-- Comment on column
COMMENT ON COLUMN customers.role IS 'Role of the customer: retail or wholesale';
