
<?php
require_once '../config.php';
header('Content-Type: application/json');
echo json_encode([
    'authorized' => isset($_SESSION['user_id']) && $_SESSION['role'] === 'secretary'
]);
?>
