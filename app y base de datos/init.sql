-- Initial database setup for Bodega Mayorista
-- This runs automatically when PostgreSQL container starts

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table with wholesale support
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    brand VARCHAR(100),
    model VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'unidad',
    cost_price DECIMAL(10, 2),
    price DECIMAL(10, 2),
    wholesale_price DECIMAL(10, 2),
    min_wholesale_qty INTEGER DEFAULT 12,
    stock INTEGER DEFAULT 0,
    supplier VARCHAR(200),
    condition VARCHAR(50) DEFAULT 'nuevo',
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tiered pricing for volume discounts
CREATE TABLE IF NOT EXISTS tiered_pricing (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table (wholesale clients)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    hashed_password VARCHAR(200) NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(100),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(30) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado')),
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    delivery_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

-- Create conversations table for chat history
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    sender_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    hashed_password VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create price history table for auditing price changes
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    old_cost DECIMAL(10, 2),
    new_cost DECIMAL(10, 2),
    change_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, hashed_password, role) VALUES 
('admin', '$2b$12$lgLKvknJ3gf4hyDmOSpoVOlSMSm7euSdPnAGx1fWxTAxxKp3DhjmW', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert technology zones (categories)
INSERT INTO categories (name, description, icon) VALUES
    ('Apple', 'iPhones, iPads, MacBooks, AirPods y productos Apple', '🍎'),
    ('Android', 'Samsung, Xiaomi, Motorola y dispositivos Android', '🤖'),
    ('Cacharros', 'Artículos variados de tecnología y electrónica', '🎁'),
    ('Accesorios', 'Fundas, audífonos, vidrios templados, cargadores', '🎧')
ON CONFLICT (name) DO NOTHING;

-- Insert sample technology products - PRECIOS EN PESOS COLOMBIANOS (COP)
INSERT INTO products (name, category_id, brand, unit, price, wholesale_price, min_wholesale_qty, stock, description, image_url) VALUES
    -- ZONA APPLE (category_id = 1) - Precios detal Colombia 2024
    ('iPhone 15 Pro Max 256GB', 1, 'Apple', 'unidad', 5899000.00, 5650000.00, 3, 15, 'iPhone 15 Pro Max con chip A17 Pro, cámara de 48MP, titanio', '/tienda-static/img/iphone_15_pro_max_titanium_1770072908775.png'),
    ('iPhone 15 128GB', 1, 'Apple', 'unidad', 4299000.00, 4050000.00, 5, 25, 'iPhone 15 con Dynamic Island y USB-C', '/tienda-static/img/iphone_15_blue_1770072921666.png'),
    ('iPhone 14 128GB', 1, 'Apple', 'unidad', 3599000.00, 3350000.00, 5, 30, 'iPhone 14 con chip A15 Bionic', '/tienda-static/img/iphone_14_midnight_1770072935887.png'),
    ('iPhone 13 128GB', 1, 'Apple', 'unidad', 2899000.00, 2650000.00, 5, 35, 'iPhone 13 con cámara dual 12MP', '/tienda-static/img/iphone_13_starlight_1770072947537.png'),
    ('AirPods Pro 2da Gen', 1, 'Apple', 'unidad', 1099000.00, 980000.00, 5, 40, 'AirPods Pro con cancelación de ruido activa y USB-C', '/tienda-static/img/airpods_pro_2_1770072966969.png'),
    ('AirPods 3ra Gen', 1, 'Apple', 'unidad', 849000.00, 750000.00, 5, 50, 'AirPods con audio espacial', 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300'),
    ('Apple Watch Series 9 45mm', 1, 'Apple', 'unidad', 1999000.00, 1850000.00, 3, 20, 'Apple Watch S9 GPS con chip S9 SiP', '/tienda-static/img/apple_watch_s9_1770072980136.png'),
    ('Apple Watch SE 2da Gen', 1, 'Apple', 'unidad', 1199000.00, 1050000.00, 3, 25, 'Apple Watch SE GPS 44mm', 'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=300'),
    ('iPad 10ma Gen 64GB', 1, 'Apple', 'unidad', 2099000.00, 1950000.00, 3, 18, 'iPad con chip A14 Bionic y pantalla 10.9"', '/tienda-static/img/ipad_10_gen_1770072992776.png'),
    ('MacBook Air M2 256GB', 1, 'Apple', 'unidad', 5499000.00, 5200000.00, 2, 10, 'MacBook Air con chip M2, 8GB RAM', '/tienda-static/img/macbook_air_m2_1770073005714.png'),
    
    -- ZONA ANDROID (category_id = 2) - Precios detal Colombia 2024
    ('Samsung Galaxy S24 Ultra 256GB', 2, 'Samsung', 'unidad', 5699000.00, 5400000.00, 3, 12, 'Galaxy S24 Ultra con S Pen integrado, IA Galaxy', '/tienda-static/img/samsung_s24_ultra_1770073638699.png'),
    ('Samsung Galaxy S24 128GB', 2, 'Samsung', 'unidad', 3899000.00, 3650000.00, 5, 20, 'Galaxy S24 con IA integrada y cámara 50MP', '/tienda-static/img/samsung_s24_1770073652710.png'),
    ('Samsung Galaxy A54 128GB', 2, 'Samsung', 'unidad', 1699000.00, 1550000.00, 5, 40, 'Galaxy A54 5G con pantalla Super AMOLED 120Hz', '/tienda-static/img/samsung_a54_1770073667732.png'),
    ('Samsung Galaxy A34 128GB', 2, 'Samsung', 'unidad', 1299000.00, 1150000.00, 8, 45, 'Galaxy A34 5G resistente al agua IP67', '/tienda-static/img/samsung_a34_1770073683039.png'),
    ('Samsung Galaxy A15 128GB', 2, 'Samsung', 'unidad', 699000.00, 620000.00, 10, 60, 'Galaxy A15 con pantalla Super AMOLED', '/tienda-static/img/samsung_a15_1770073710028.png'),
    ('Xiaomi 14 Ultra', 2, 'Xiaomi', 'unidad', 4999000.00, 4700000.00, 3, 15, 'Xiaomi 14 Ultra con cámara Leica profesional', '/tienda-static/img/xiaomi_14_ultra_1770073749047.png'),
    ('Xiaomi Redmi Note 13 Pro', 2, 'Xiaomi', 'unidad', 1199000.00, 1050000.00, 8, 50, 'Redmi Note 13 Pro con cámara 200MP', '/tienda-static/img/redmi_note_13_pro_1770073765782.png'),
    ('Xiaomi Redmi Note 13', 2, 'Xiaomi', 'unidad', 799000.00, 700000.00, 10, 70, 'Redmi Note 13 con pantalla AMOLED 120Hz', 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=300'),
    ('Xiaomi Poco X6 Pro', 2, 'Xiaomi', 'unidad', 1399000.00, 1250000.00, 5, 35, 'Poco X6 Pro gaming con Dimensity 8300', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300'),
    ('Motorola Edge 40 Neo', 2, 'Motorola', 'unidad', 1599000.00, 1450000.00, 5, 25, 'Motorola Edge 40 Neo con carga 68W', 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=300'),
    ('Motorola Moto G54', 2, 'Motorola', 'unidad', 849000.00, 750000.00, 8, 40, 'Moto G54 5G con batería 5000mAh', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'),
    ('Samsung Galaxy Tab S9 128GB', 2, 'Samsung', 'unidad', 3299000.00, 3050000.00, 3, 12, 'Galaxy Tab S9 con pantalla AMOLED 120Hz', '/tienda-static/img/samsung_tab_s9_1770073727205.png'),
    
    -- ZONA CACHARROS (category_id = 3) - Precios detal Colombia 2024
    ('Ring Light 26cm con Tripié', 3, 'Genérico', 'unidad', 89000.00, 65000.00, 10, 80, 'Aro de luz LED para streaming y fotos, 3 modos', 'https://images.unsplash.com/photo-1594394489098-74ac04c0fc2e?w=300'),
    ('Ring Light 33cm Profesional', 3, 'Genérico', 'unidad', 159000.00, 120000.00, 8, 50, 'Aro de luz grande con control remoto Bluetooth', 'https://images.unsplash.com/photo-1594394489098-74ac04c0fc2e?w=300'),
    ('Soporte Celular Magnético Auto', 3, 'Genérico', 'unidad', 35000.00, 22000.00, 20, 150, 'Soporte magnético para ventilación 360°', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300'),
    ('Power Bank 20000mAh', 3, 'Xiaomi', 'unidad', 149000.00, 115000.00, 10, 60, 'Batería portátil Xiaomi con carga rápida 22.5W', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300'),
    ('Power Bank 10000mAh', 3, 'Genérico', 'unidad', 69000.00, 48000.00, 15, 100, 'Batería portátil compacta con 2 puertos USB', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300'),
    ('Lámpara LED Escritorio Plegable', 3, 'Genérico', 'unidad', 59000.00, 42000.00, 12, 70, 'Lámpara LED táctil regulable con puerto USB', 'https://images.unsplash.com/photo-1534281305182-85e11e4f1d0d?w=300'),
    ('Mini Ventilador USB Recargable', 3, 'Genérico', 'unidad', 29000.00, 18000.00, 24, 200, 'Ventilador portátil 3 velocidades', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300'),
    ('Báscula Digital Bluetooth', 3, 'Genérico', 'unidad', 79000.00, 55000.00, 12, 90, 'Báscula de baño con app para métricas corporales', 'https://images.unsplash.com/photo-1612460844075-e8cee16c2f70?w=300'),
    ('Parlante Bluetooth Portátil', 3, 'Genérico', 'unidad', 99000.00, 70000.00, 10, 80, 'Speaker 10W resistente al agua IPX5', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300'),
    ('Webcam 1080p con Micrófono', 3, 'Genérico', 'unidad', 139000.00, 100000.00, 8, 45, 'Cámara web Full HD para videollamadas', 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=300'),
    ('Mouse Inalámbrico Ergonómico', 3, 'Genérico', 'unidad', 45000.00, 30000.00, 15, 120, 'Mouse 2.4GHz con receptor USB silencioso', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300'),
    ('Teclado Bluetooth Slim', 3, 'Genérico', 'unidad', 89000.00, 65000.00, 10, 60, 'Teclado inalámbrico recargable multidevice', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300'),
    
    -- ZONA ACCESORIOS (category_id = 4) - Precios detal Colombia 2024
    ('Funda iPhone 15/15 Pro Silicona', 4, 'Genérico', 'unidad', 35000.00, 18000.00, 20, 300, 'Funda de silicona suave con interior microfibra', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300'),
    ('Funda iPhone 14/13 Transparente', 4, 'Genérico', 'unidad', 25000.00, 12000.00, 25, 350, 'Funda clear anti-amarillamiento con bordes reforzados', 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300'),
    ('Funda Samsung S24/S23 Clear', 4, 'Genérico', 'unidad', 29000.00, 15000.00, 20, 280, 'Funda transparente anti-golpes grado militar', 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300'),
    ('Funda Samsung A54/A34 Silicona', 4, 'Genérico', 'unidad', 22000.00, 10000.00, 30, 400, 'Funda de silicona mate premium', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300'),
    ('Vidrio Templado iPhone 15/14/13', 4, 'Genérico', 'unidad', 15000.00, 6000.00, 50, 500, 'Protector de pantalla 9H con guía de instalación', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300'),
    ('Vidrio Templado Samsung S24/S23', 4, 'Genérico', 'unidad', 18000.00, 8000.00, 50, 450, 'Protector curvo UV compatible con huella', 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=300'),
    ('Vidrio Templado Samsung A Series', 4, 'Genérico', 'unidad', 12000.00, 5000.00, 60, 600, 'Protector 9H borde negro anti-huellas', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300'),
    ('Audífonos Bluetooth TWS Pro', 4, 'Genérico', 'unidad', 89000.00, 55000.00, 20, 150, 'Audífonos inalámbricos con estuche carga y ANC', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300'),
    ('Audífonos Bluetooth TWS Básicos', 4, 'Genérico', 'unidad', 49000.00, 28000.00, 30, 250, 'Audífonos TWS con estuche compacto 20h autonomía', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300'),
    ('Manos Libres Bluetooth Mono', 4, 'Genérico', 'unidad', 35000.00, 20000.00, 25, 180, 'Audífono mono para llamadas 10h batería', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=300'),
    ('Cable USB-C a USB-C 1m', 4, 'Genérico', 'unidad', 18000.00, 9000.00, 50, 400, 'Cable de carga rápida 60W PD', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300'),
    ('Cable USB-C a Lightning 1m', 4, 'Genérico', 'unidad', 25000.00, 14000.00, 40, 350, 'Cable MFi para iPhone carga rápida 20W', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300'),
    ('Cargador Rápido 20W USB-C', 4, 'Genérico', 'unidad', 45000.00, 28000.00, 20, 200, 'Adaptador Power Delivery compatible iPhone/Samsung', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300'),
    ('Cargador Rápido 33W Dual', 4, 'Genérico', 'unidad', 65000.00, 42000.00, 15, 150, 'Cargador USB-C + USB-A carga simultánea', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300'),
    ('Cargador Inalámbrico 15W', 4, 'Genérico', 'unidad', 55000.00, 35000.00, 15, 120, 'Base de carga Qi compatible MagSafe', 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=300'),
    ('Soporte Celular Escritorio', 4, 'Genérico', 'unidad', 25000.00, 14000.00, 25, 200, 'Base ajustable aluminio para escritorio', 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300')
ON CONFLICT DO NOTHING;

-- Insert tiered pricing for technology products (COP)
INSERT INTO tiered_pricing (product_id, min_quantity, price_per_unit) VALUES
    -- iPhone 15 Pro Max tiered pricing
    (1, 3, 5650000.00),
    (1, 5, 5500000.00),
    (1, 10, 5350000.00),
    -- Vidrio Templado iPhone tiered pricing
    (39, 50, 6000.00),
    (39, 100, 5000.00),
    (39, 200, 4000.00),
    -- Fundas iPhone tiered pricing
    (35, 20, 18000.00),
    (35, 50, 15000.00),
    (35, 100, 12000.00),
    -- Audífonos TWS Pro tiered pricing
    (42, 20, 55000.00),
    (42, 50, 48000.00),
    (42, 100, 42000.00)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tiered_pricing_product ON tiered_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
