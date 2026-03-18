<?php
require_once 'config.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['school_id'] = $user['school_id'];
        
        $token = bin2hex(random_bytes(32));
        $_SESSION['token'] = $token;
        setcookie('auth_token', $token, time() + 7200, '/', '', true, true);
        
        if ($user['role'] === 'secretary') header('Location: scanner.php');
        elseif ($user['role'] === 'admin') header('Location: admin.php');
        else header('Location: dashboard.php');
        exit();
    } else {
        $error = '❌ Wrong username or password!';
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>🔐 Login - School Attendance</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:Arial;background:#f0f2f5;padding:50px;text-align:center;}form{max-width:400px;margin:auto;background:white;padding:30px;border-radius:10px;box-shadow:0 5px 15px rgba(0,0,0,0.1);}input{width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:5px;}button{width:100%;padding:12px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;}.error{background:#ffe6e6;color:#d00;padding:10px;border-radius:5px;margin:10px 0;}</style>
</head>
<body>
    <form method="POST">
        <h2>🏫 School Attendance System</h2>
        <?php if($error) echo "<div class='error'>$error</div>"; ?>
        <input type="text" name="username" placeholder="Username" required autofocus>
        <input type="password" name="password" placeholder="Password" required>
        <button>Login 🚀</button>
        <p><small>Admin: admin/admin123<br>Secretary: secretary1/123456</small></p>
    </form>
</body>
</html>
