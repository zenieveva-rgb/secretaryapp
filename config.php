<?php
session_start();

$host = 'localhost';
$dbname = 'attendance_system';
$username = 'root';  // ⚠️ CHANGE YOUR DB USERNAME
$password = '';      // ⚠️ CHANGE YOUR DB PASSWORD

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage());
}

// 🔥 TRIPLE SECURITY CHECK
function requireSecretary($pdo) {
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'secretary') {
        header('Location: login.php?error=unauthorized');
        exit();
    }
    
    // LIVE database verification
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND is_active = 1 AND role = 'secretary'");
    $stmt->execute([$_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        session_destroy();
        header('Location: login.php?error=access_denied');
        exit();
    }
}

function requireAdmin($pdo) {
    requireSecretary($pdo);
    if ($_SESSION['role'] !== 'admin') {
        header('Location: dashboard.php?error=admin_only');
        exit();
    }
}
?>
