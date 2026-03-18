<?php
require_once 'config.php';
requireSecretary($pdo);
?>
<!DOCTYPE html>
<html><head><title>Dashboard</title><style>body{font-family:Arial;padding:50px;text-align:center;background:#f0f2f5;}</style></head>
<body>
    <h1>📊 Dashboard</h1>
    <p>👤 Welcome, <?= $_SESSION['username'] ?> (<?= $_SESSION['role'] ?>)</p>
    <?php if($_SESSION['role'] === 'secretary'): ?>
        <a href="scanner.php" style="background:#28a745;color:white;padding:15px 30px;border-radius:25px;text-decoration:none;font-size:20px;display:inline-block;margin:20px;">📱 Start QR Scanner</a>
    <?php endif; ?>
    <a href="logout.php" style="background:#dc3545;color:white;padding:15px 30px;border-radius:25px;text-decoration:none;font-size:18px;display:inline-block;">🚪 Logout</a>
</body>
</html>
