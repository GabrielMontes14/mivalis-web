<?php
// api/get_products.php
header('Content-Type: application/json');
require_once 'config.php';

$sql = "SELECT * FROM productos ORDER BY id DESC";
$result = $mysqli->query($sql);

if ($result) {
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    echo json_encode($products);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener productos: ' . $mysqli->error]);
}

$mysqli->close();
?>
