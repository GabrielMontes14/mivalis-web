<?php
// api/config.php
$host = 'localhost';
$user = 'root';
$password = ''; // Vacío por defecto en XAMPP
$db = 'Mivalisweb';

$mysqli = new mysqli($host, $user, $password, $db);

if ($mysqli->connect_error) {
    die(json_encode(['error' => 'Error de conexión (' . $mysqli->connect_errno . ') ' . $mysqli->connect_error]));
}

// Set charset to utf8mb4
$mysqli->set_charset("utf8mb4");
?>
