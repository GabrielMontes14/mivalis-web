<?php
// api/get_orders.php
header('Content-Type: application/json');
require_once 'config.php';

// Simular usuario autenticado (ID 1)
$user_id = 1;

$response = [];

// 1. Obtener Pedidos (Tabla 'pedidos')
$sql = "SELECT id, total, estado as status, fecha as date FROM pedidos WHERE user_id = ? ORDER BY fecha DESC";
$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    $stmt->close();

    // 2. Obtener Items para cada pedido (Tabla 'detalles_pedido')
    foreach ($orders as &$order) {
        $sqlItems = "SELECT nombre_producto as name, cantidad as quantity, precio as price FROM detalles_pedido WHERE pedido_id = ?";
        $stmtItems = $mysqli->prepare($sqlItems);
        if ($stmtItems) {
            $stmtItems->bind_param("s", $order['id']);
            $stmtItems->execute();
            $resultItems = $stmtItems->get_result();
            
            $items = [];
            while ($item = $resultItems->fetch_assoc()) {
                $items[] = $item;
            }
            $order['items'] = $items;
            $stmtItems->close();
        }
    }

    echo json_encode($orders);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la consulta: ' . $mysqli->error]);
}

$mysqli->close();
?>
