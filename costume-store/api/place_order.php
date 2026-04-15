<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['items']) || !is_array($data['items']) || count($data['items']) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'El carrito está vacío']);
    exit;
}

$user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
$customer = isset($data['customer']) ? trim($data['customer']) : 'Invitado';
$address = isset($data['address']) ? trim($data['address']) : '';
$total = floatval($data['total']);
$items = $data['items'];

// Generar ID único para el pedido
$order_id = 'ORD-' . time() . '-' . rand(100, 999);

$mysqli->begin_transaction();

try {
    // Insertar pedido
    $stmt = $mysqli->prepare("INSERT INTO pedidos (id, user_id, cliente_nombre, total, estado, fecha) VALUES (?, ?, ?, ?, 'Pending', NOW())");
    $stmt->bind_param("sisd", $order_id, $user_id, $customer, $total);
    $stmt->execute();
    $stmt->close();

    // Insertar detalles
    $stmtDetail = $mysqli->prepare("INSERT INTO detalles_pedido (pedido_id, producto_id, nombre_producto, cantidad, precio) VALUES (?, ?, ?, ?, ?)");

    foreach ($items as $item) {
        $product_id = intval($item['id']);
        $name = $item['name'];
        $qty = intval($item['quantity']);
        $price = floatval($item['price']);

        $stmtDetail->bind_param("sisid", $order_id, $product_id, $name, $qty, $price);
        $stmtDetail->execute();

        // Reducir stock
        $mysqli->query("UPDATE productos SET stock = stock - $qty WHERE id = $product_id AND stock >= $qty");
    }
    $stmtDetail->close();

    $mysqli->commit();

    echo json_encode([
        'success' => true,
        'order_id' => $order_id,
        'message' => 'Pedido creado exitosamente'
    ]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(['error' => 'Error al crear pedido: ' . $e->getMessage()]);
}

$mysqli->close();
?>
