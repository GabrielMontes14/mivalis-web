<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || !isset($data['email']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan campos requeridos']);
    exit;
}

$name = trim($data['name']);
$email = trim($data['email']);
$password = password_hash($data['password'], PASSWORD_DEFAULT);

// Verificar si el email ya existe
$check = $mysqli->prepare("SELECT id FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'El correo ya está registrado']);
    $check->close();
    $mysqli->close();
    exit;
}
$check->close();

$stmt = $mysqli->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $password);

if ($stmt->execute()) {
    $userId = $stmt->insert_id;
    session_start();
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;
    echo json_encode([
        'success' => true,
        'user' => ['id' => $userId, 'name' => $name, 'email' => $email]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al registrar: ' . $stmt->error]);
}

$stmt->close();
$mysqli->close();
?>
