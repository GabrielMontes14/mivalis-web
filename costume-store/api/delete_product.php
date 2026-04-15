<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta ID del producto']);
    exit;
}

$id = intval($data['id']);

$stmt = $mysqli->prepare("DELETE FROM productos WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Producto eliminado']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al eliminar: ' . $stmt->error]);
}

$stmt->close();
$mysqli->close();
?>
