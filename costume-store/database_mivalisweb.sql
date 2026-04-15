-- Crear Base de Datos
CREATE DATABASE IF NOT EXISTS Mivalisweb;
USE Mivalisweb;

-- Tabla: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255)
);

-- Tabla: productos
-- Se asegura el uso de ENUM en minúsculas como solicitado
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    precio DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    imagen VARCHAR(255),
    estado ENUM('listo', 'alquilado', 'mantenimiento', 'no_devuelto') DEFAULT 'listo',
    descripcion TEXT
);

-- Tabla: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    cliente_nombre VARCHAR(100),
    total DECIMAL(10, 2) NOT NULL,
    estado ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: detalles_pedido
CREATE TABLE IF NOT EXISTS detalles_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id VARCHAR(50),
    producto_id INT,
    nombre_producto VARCHAR(255),
    cantidad INT,
    precio DECIMAL(10, 2),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Datos de Prueba para Productos
INSERT INTO productos (nombre, categoria, precio, stock, imagen, estado, descripcion) VALUES
('Batman - El Caballero de la Noche', 'Superhéroes', 59.99, 10, 'https://images.unsplash.com/photo-1601456106631-01f4640d243b?q=80&w=600&auto=format&fit=crop', 'listo', 'Traje de Batman blindado de alta calidad.'),
('Bruja Clásica', 'Terror', 34.50, 25, 'https://images.unsplash.com/photo-1541364577-165e141492ba?q=80&w=600&auto=format&fit=crop', 'listo', 'Disfraz de bruja atemporal con sombrero puntiagudo.'),
('Dinosaurio Inflable', 'Animales', 45.00, 5, 'https://images.unsplash.com/photo-1550948956-6218e87d6564?q=80&w=600&auto=format&fit=crop', 'alquilado', 'Disfraz inflable de T-Rex viral.'),
('Vampiro Victoriano', 'De Época', 65.00, 12, 'https://images.unsplash.com/photo-1635593740292-0f5f7f34c673?q=80&w=600&auto=format&fit=crop', 'mantenimiento', 'Elegante traje de vampiro de terciopelo.'),
('Mujer Maravilla', 'Superhéroes', 55.00, 15, 'https://images.unsplash.com/photo-1579952579626-d62153b8fc7d?q=80&w=600&auto=format&fit=crop', 'no_devuelto', 'Réplica clásica de la armadura de guerrera amazona.'),
('Pequeña Calabaza', 'Otros', 25.00, 30, 'https://images.unsplash.com/photo-1508266205937-4f24c3d3dd52?q=80&w=600&auto=format&fit=crop', 'listo', 'Adorable traje de calabaza para niños pequeños.');

-- Script de Migración para datos existentes (Ejecutar si ya hay datos con valores incorrectos)
-- UPDATE productos SET estado = 'listo' WHERE estado NOT IN ('listo', 'alquilado', 'mantenimiento', 'no_devuelto');
