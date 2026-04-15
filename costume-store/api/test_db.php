<?php
// api/test_db.php
header('Content-Type: application/json');
require_once 'config.php';

// Script solicitado por el usuario
$sql = "SELECT id, nombre, estado FROM productos";
$result = $mysqli->query($sql);

if ($result) {
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode($data, JSON_PRETTY_PRINT);
} else {
    echo json_encode(['error' => $mysqli->error]);
}

$mysqli->close();
?>
