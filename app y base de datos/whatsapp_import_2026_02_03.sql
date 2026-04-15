-- ACTUALIZACIÓN DE INVENTARIO DESDE WHATSAPP (FECHA: 2026-02-03)
-- NOTA: Los precios en el mensaje parecen venir abreviados (ej: 1.550 = 1.550.000)

BEGIN;

-- 1. Insertar Categorías si no existen
INSERT INTO categories (name, description, icon) VALUES 
('Celulares Usados', 'iPhones y smartphones usados grado A++', 'fa-mobile-alt')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, icon) VALUES 
('Celulares Nuevos', 'iPhones y smartphones nuevos sellados', 'fa-box-open')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, icon) VALUES 
('Audio y Sonido', 'Parlantes y audífonos JBL, Apple', 'fa-headphones')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, icon) VALUES 
('Consolas y Videojuegos', 'PlayStation y accesorios', 'fa-gamepad')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, icon) VALUES 
('Tablets', 'iPad y tablets', 'fa-tablet-alt')
ON CONFLICT (name) DO NOTHING;


-- 2. Productos USADOS (Grado A++)
-- iPhone 12 128GB - 1.550.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 12 128GB (Grado A++)', 'Apple', 'iPhone 12', '128GB', 'usado', 1550000, 1450000, 5, 'https://images.unsplash.com/photo-1611472173366-3dso203n2?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 1550000, stock = 5, is_active = true;

-- iPhone 13 256GB - 1.680.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 13 256GB (Grado A++)', 'Apple', 'iPhone 13', '256GB', 'usado', 1680000, 1580000, 5, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 1680000, stock = 5, is_active = true;

-- iPhone 13 Pro 128GB - 1.800.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 13 Pro 128GB (Grado A++)', 'Apple', 'iPhone 13 Pro', '128GB', 'usado', 1800000, 1700000, 4, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 1800000, stock = 4, is_active = true;

-- iPhone 13 Pro Max 128GB - 2.050.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 13 Pro Max 128GB (Grado A++)', 'Apple', 'iPhone 13 Pro Max', '128GB', 'usado', 2050000, 1950000, 3, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2050000, stock = 3, is_active = true;

-- iPhone 14 256GB - 1.670.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 14 256GB (Grado A++)', 'Apple', 'iPhone 14', '256GB', 'usado', 1670000, 1580000, 4, 'https://images.unsplash.com/photo-1678685888221-cda773a3dcd9?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 1670000, stock = 4, is_active = true;

-- iPhone 15 128GB - 2.000.000 (Negro) y 2.080.000 (Consimcar - Azul) -> Promedio o Variantes? Usaremos el base.
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 15 128GB (Grado A++)', 'Apple', 'iPhone 15', '128GB', 'usado', 2000000, 1900000, 6, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2000000, stock = 6, is_active = true;

-- iPhone 15 Pro 128GB - 2.350.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 15 Pro 128GB (Grado A++)', 'Apple', 'iPhone 15 Pro', '128GB', 'usado', 2350000, 2250000, 5, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 2350000, stock = 5, is_active = true;

-- iPhone 15 Pro Max 256GB - 2.700.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 15 Pro Max 256GB (Grado A++)', 'Apple', 'iPhone 15 Pro Max', '256GB', 'usado', 2700000, 2600000, 4, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2700000, stock = 4, is_active = true;

-- iPhone 16 128GB - 2.800.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 16 128GB (Grado A++)', 'Apple', 'iPhone 16', '128GB', 'usado', 2800000, 2700000, 3, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2800000, stock = 3, is_active = true;

-- iPhone 16 Pro 128GB - 2.920.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 16 Pro 128GB (Grado A++)', 'Apple', 'iPhone 16 Pro', '128GB', 'usado', 2920000, 2820000, 3, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 2920000, stock = 3, is_active = true;

-- iPhone 16 Pro 256GB - 3.190.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 16 Pro 256GB (Grado A++)', 'Apple', 'iPhone 16 Pro', '256GB', 'usado', 3190000, 3090000, 3, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 3190000, stock = 3, is_active = true;

-- iPhone 16 Pro Max 256GB - 3.890.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 16 Pro Max 256GB (Grado A++)', 'Apple', 'iPhone 16 Pro Max', '256GB', 'usado', 3890000, 3790000, 2, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 3890000, stock = 2, is_active = true;

-- iPhone 16 Pro Max 512GB - 3.900.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 16 Pro Max 512GB (Grado A++)', 'Apple', 'iPhone 16 Pro Max', '512GB', 'usado', 3900000, 3800000, 2, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 3900000, stock = 2, is_active = true;

-- iPhone 17 (Future/Concept) 256GB - 4.000.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 17 256GB (Reserva/Concepto)', 'Apple', 'iPhone 17', '256GB', 'usado', 4000000, 3900000, 1, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Usados'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 4000000, stock = 1, is_active = true;


-- 3. Productos NUEVOS
-- JBL Flip 7
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('JBL Flip 7', 'JBL', 'Flip 7', 'nuevo', 580000, 520000, 10, 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 580000, stock = 10, is_active = true;

-- JBL Grip
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('JBL Grip', 'JBL', 'Grip', 'nuevo', 410000, 380000, 5, 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 410000, stock = 5, is_active = true;

-- JBL Clip 5
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('JBL Clip 5', 'JBL', 'Clip 5', 'nuevo', 280000, 250000, 8, 'https://images.unsplash.com/photo-1610444565780-602934c9c104?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 280000, stock = 8, is_active = true;

-- Partybox On The Go
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('JBL Partybox On The Go Essential', 'JBL', 'Partybox', 'nuevo', 1100000, 1000000, 3, 'https://images.unsplash.com/photo-1618386407358-316531398863?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 1100000, stock = 3, is_active = true;

-- Partybox 320
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('JBL Partybox 320', 'JBL', 'Partybox 320', 'nuevo', 1960000, 1850000, 2, 'https://images.unsplash.com/photo-1618386407358-316531398863?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 1960000, stock = 2, is_active = true;

-- Consolas: Play 5 1T
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('PlayStation 5 Slim 1TB + 2 Juegos', 'Sony', 'PS5', '1TB', 'nuevo', 2350000, 2250000, 5, 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Consolas y Videojuegos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2350000, stock = 5, is_active = true;

-- AirPods Pro 3
INSERT INTO products (name, brand, model, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('AirPods Pro 3', 'Apple', 'AirPods', 'nuevo', 1200000, 1100000, 10, 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07afe?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Audio y Sonido'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 1200000, stock = 10, is_active = true;

-- iPad 11 A16 128GB
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPad 11 (A16) 128GB', 'Apple', 'iPad 11', '128GB', 'nuevo', 1730000, 1630000, 4, 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Tablets'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 1730000, stock = 4, is_active = true;

-- iPhone 13 128GB (NUEVO) - 1.950.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 13 128GB (Nuevo)', 'Apple', 'iPhone 13', '128GB', 'nuevo', 1950000, 1850000, 5, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 1950000, stock = 5, is_active = true;

-- iPhone 14 128GB (NUEVO) - 2.000.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 14 128GB (Nuevo)', 'Apple', 'iPhone 14', '128GB', 'nuevo', 2000000, 1900000, 5, 'https://images.unsplash.com/photo-1678685888221-cda773a3dcd9?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2000000, stock = 5, is_active = true;

-- iPhone 15 128GB (NUEVO) - 2.590.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 15 128GB (Nuevo)', 'Apple', 'iPhone 15', '128GB', 'nuevo', 2590000, 2450000, 8, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 2590000, stock = 8, is_active = true;

-- iPhone 15 512GB (NUEVO) - 2.930.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 15 512GB (Nuevo)', 'Apple', 'iPhone 15', '512GB', 'nuevo', 2930000, 2800000, 3, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 2930000, stock = 3, is_active = true;

-- iPhone 17 (Future/Concept) 256GB - 3.780.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 17 256GB (Reserva Nuevo)', 'Apple', 'iPhone 17', '256GB', 'nuevo', 3780000, 3650000, 2, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 3780000, stock = 2, is_active = true;

-- iPhone 17 Pro Max 256GB - 5.800.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 17 Pro Max 256GB (Reserva/Concepto)', 'Apple', 'iPhone 17 Pro Max', '256GB', 'nuevo', 5800000, 5600000, 2, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, true)
ON CONFLICT (name) DO UPDATE SET price = 5800000, stock = 2, is_active = true;

-- iPhone 17 Pro Max 512GB - 6.500.000
INSERT INTO products (name, brand, model, storage, condition, price, wholesale_price, stock, image_url, category_id, is_active, is_featured)
VALUES ('iPhone 17 Pro Max 512GB (Reserva/Concepto)', 'Apple', 'iPhone 17 Pro Max', '512GB', 'nuevo', 6500000, 6300000, 2, 'https://images.unsplash.com/photo-1721665492067-272e735073e1?auto=format&fit=crop&w=800', (SELECT id FROM categories WHERE name='Celulares Nuevos'), true, false)
ON CONFLICT (name) DO UPDATE SET price = 6500000, stock = 2, is_active = true;


COMMIT;
