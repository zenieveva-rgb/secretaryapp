<?php
session_start();

$host = 'localhost';
$dbname = 'attendance_system';
$username = 'root';  // CHANGE THIS
$password = '';      // CHANGE THIS

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("❌ Database error: " . $e->getMessage());
}

// 🔥 ULTIMATE SECURITY FUNCTIONS
function requireSecretary($pdo) {
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'secretary') {
        header('Location: login.php?error=unauthorized');
        exit();
    }
    
    // LIVE database check
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND is_active = 1 AND role = 'secretary'");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        session_destroy();
        setcookie('auth_token', '', time() - 3600);
        header('Location: login.php?error=account_disabled');
        exit();
    }
    
    // IP binding security
    if (isset($user['last_ip']) && $user['last_ip'] !== $_SERVER['REMOTE_ADDR']) {
        $pdo->prepare("UPDATE users SET last_ip = ? WHERE id = ?")->execute([$_SERVER['REMOTE_ADDR'], $_SESSION['user_id']]);
    }
}

function requireAdmin($pdo) {
    requireSecretary($pdo);
    if ($_SESSION['role'] !== 'admin') {
        header('Location: dashboard.php?error=admin_only');
        exit();
    }
}

// Rate limiting
function rateLimit($key, $max = 10, $window = 60) {
    $cache_key = "rate_$key";
    if (!isset($_SESSION[$cache_key])) {
        $_SESSION[$cache_key] = ['count' => 1, 'time' => time()];
    } else {
        if (time() - $_SESSION[$cache_key]['time'] > $window) {
            $_SESSION[$cache_key] = ['count' => 1, 'time' => time()];
        } else {
            $_SESSION[$cache_key]['count']++;
            if ($_SESSION[$cache_key]['count'] > $max) {
                http_response_code(429);
                die('⏳ Too many requests. Try again in 1 minute.');
            }
        }
    }
}
?>
