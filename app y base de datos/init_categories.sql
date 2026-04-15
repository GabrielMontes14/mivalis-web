INSERT INTO categories (name, icon, description, created_at)
VALUES 
('Apple', '🍎', 'Productos Apple', NOW()),
('Android', '🤖', 'Dispositivos Android', NOW()),
('Cacharros', '🎁', 'Gadgets y curiosidades', NOW()),
('Accesorios', '🎧', 'Auriculares, cargadores y más', NOW())
ON CONFLICT (name) DO NOTHING;
