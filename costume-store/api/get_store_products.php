<?php
// api/get_store_products.php
// API para la TIENDA (Solo productos listos)
header('Content-Type: application/json');
require_once 'config.php';

// Filtrar solo productos con estado 'listo' y con stock > 0
$sql = "SELECT * FROM productos WHERE estado = 'listo' AND stock > 0 ORDER BY id DESC";
$result = $mysqli->query($sql);

if ($result) {
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    echo json_encode($products);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener productos de la tienda: ' . $mysqli->error]);
}

$mysqli->close();
?>
