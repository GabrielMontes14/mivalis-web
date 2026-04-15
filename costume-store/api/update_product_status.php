<?php
// api/update_product_status.php
header('Content-Type: application/json');
require_once 'config.php';

// Obtener datos del body (JSON)
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta ID o Status']);
    exit;
}

$id = intval($data['id']);
$status = $mysqli->real_escape_string($data['status']);

// Validar estado permitido
$allowed_statuses = ['listo', 'alquilado', 'mantenimiento', 'no_devuelto'];
if (!in_array($status, $allowed_statuses)) {
    http_response_code(400);
    echo json_encode(['error' => 'Estado no válido']);
    exit;
}

$sql = "UPDATE productos SET estado = ? WHERE id = ?";
$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("si", $status, $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Estado actualizado correctamente']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la preparación: ' . $mysqli->error]);
}

$mysqli->close();
?>
