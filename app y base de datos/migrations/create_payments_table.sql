-- Create payments table for Wompi and manual transfers
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    amount DECIMAL(12, 2) NOT NULL,
    
    -- Wompi transaction data
    wompi_transaction_id VARCHAR(100) UNIQUE,
    wompi_reference VARCHAR(100),
    wompi_status VARCHAR(50),
    
    -- Manual transfer data (Bancolombia)
    transfer_proof_url VARCHAR(500),
    transfer_reference VARCHAR(100),
    verified_by_admin BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    -- Metadata
    payment_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_wompi_transaction_id ON payments(wompi_transaction_id);

-- Add comment
COMMENT ON TABLE payments IS 'Tracks all payment transactions including Wompi and manual Bancolombia transfers';
