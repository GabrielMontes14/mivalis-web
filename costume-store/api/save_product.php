<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['nombre']) || !isset($data['precio'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan campos requeridos']);
    exit;
}

$nombre = trim($data['nombre']);
$categoria = isset($data['categoria']) ? trim($data['categoria']) : 'Otros';
$precio = floatval($data['precio']);
$stock = isset($data['stock']) ? intval($data['stock']) : 0;
$imagen = isset($data['imagen']) ? trim($data['imagen']) : '';
$descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
$estado = isset($data['estado']) ? trim($data['estado']) : 'listo';

if (isset($data['id']) && $data['id'] !== '' && $data['id'] !== null) {
    // UPDATE
    $id = intval($data['id']);
    $stmt = $mysqli->prepare("UPDATE productos SET nombre=?, categoria=?, precio=?, stock=?, imagen=?, descripcion=?, estado=? WHERE id=?");
    $stmt->bind_param("ssdisssi", $nombre, $categoria, $precio, $stock, $imagen, $descripcion, $estado, $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Producto actualizado', 'id' => $id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    // INSERT
    $stmt = $mysqli->prepare("INSERT INTO productos (nombre, categoria, precio, stock, imagen, descripcion, estado) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssdisss", $nombre, $categoria, $precio, $stock, $imagen, $descripcion, $estado);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Producto creado', 'id' => $stmt->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear: ' . $stmt->error]);
    }
    $stmt->close();
}

$mysqli->close();
?>
