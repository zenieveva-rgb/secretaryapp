<?php
require_once 'config.php';
rateLimit('login_' . $_SERVER['REMOTE_ADDR'], 5);

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        // SUCCESS - Create secure session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['school_id'] = $user['school_id'];
        
        $token = bin2hex(random_bytes(32));
        $_SESSION['token'] = $token;
        setcookie('auth_token', $token, time() + 7200, '/', '', true, true);
        
        // Update last IP
        $pdo->prepare("UPDATE users SET last_ip = ? WHERE id = ?")->execute([$_SERVER['REMOTE_ADDR'], $user['id']]);
        
        // Role-based redirect
        if ($user['role'] === 'secretary') {
            header('Location: scanner.php');
        } elseif ($user['role'] === 'admin') {
            header('Location: admin.php');
        } else {
            header('Location: dashboard.php');
        }
        exit();
    } else {
        $error = '❌ Invalid username or password!';
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>🔐 Attendance System Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h2 { text-align: center; color: #333; margin-bottom: 30px; }
        input { width: 100%; padding: 15px; margin: 10px 0; border: 2px solid #eee; border-radius: 10px; font-size: 16px; transition: border-color 0.3s; }
        input:focus { outline: none; border-color: #667eea; }
        button { width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; transition: background 0.3s; }
        button:hover { background: #5a67d8; }
        .error { background: #fed7d7; color: #c53030; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .credentials { background: #e6fffa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🏫 School Attendance System</h2>
        <?php if ($error): ?><div class="error"><?= $error ?></div><?php endif; ?>
        
        <form method="POST">
            <input type="text" name="username" placeholder="👤 Username" required autofocus>
            <input type="password" name="password" placeholder="🔑 Password" required>
            <button type="submit">🚀 Login</button>
        </form>
        
        <div class="credentials">
            <strong>🧪 Test Accounts:</strong><br>
            Admin: <code>admin / admin123</code><br>
            Secretary: <code>secretary1 / 123456</code><br>
            (5 secretaries total)
        </div>
    </div>
</body>
</html>
