<?php
require_once 'config.php';
requireAdmin($pdo);

$message = '';
if($_POST['create_secretary']){
    $username = trim($_POST['username']);
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $school_id = $_POST['school_id'];
    
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role, school_id) VALUES(?,?,?,?,'secretary')");
    $stmt->execute([$username, $email, $password, $school_id]);
    $message = "✅ Secretary '$username' created!";
}

if($_POST['bulk_create']){
    $list = explode("\n", $_POST['secretary_list']);
    $count = 0;
    foreach($list as $name){
        $name = trim($name);
        if(strlen($name)>2){
            $stmt = $pdo->prepare("INSERT IGNORE INTO users (username, email, password, role, school_id) VALUES(?,?,?, 'secretary', ?)");
            $stmt->execute([$name, $name.'@school.com', password_hash('123456', PASSWORD_DEFAULT), $_POST['school_id']]);
            $count++;
        }
    }
    $message = "✅ Created $count secretaries!";
}
?>
<!DOCTYPE html>
<html><head><title>Admin Panel</title><style>body{font-family:Arial;padding:20px;}form{max-width:600px;margin:20px auto;background:white;padding:30px;border-radius:10px;box-shadow:0 5px 15px rgba(0,0,0,0.1);}input,select,textarea{width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:5px;}button{width:100%;padding:15px;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;}.success{background:#d4edda;color:#155724;padding:15px;border-radius:5px;margin:20px 0;table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:12px;border:1px solid #ddd;text-align:left;}</style></head>
<body>
    <h1>👑 Admin Panel - Create Secretaries</h1>
    <?php if($message) echo "<div class='success'>$message</div>"; ?>
    
    <!-- Single Secretary -->
    <form method="POST">
        <h3>➕ Create Single Secretary</h3>
        <select name="school_id">
            <?php
            $schools = $pdo->query("SELECT * FROM schools")->fetchAll();
            foreach($schools as $s) echo "<option value='{$s['id']}'>{$s['name']}</option>";
            ?>
        </select>
        <input name="username" placeholder="Username (ms_cruz)" required>
        <input name="email" placeholder="Email" type="email" required>
        <input name="password" placeholder="Password" type="password" required>
        <button name="create_secretary">Create Secretary</button>
    </form>
    
    <!-- Bulk Create -->
    <form method="POST">
        <h3>🔥 Bulk Create (One per line)</h3>
        <select name="school_id">
            <?php foreach($schools as $s) echo "<option value='{$s['id']}'>{$s['name']}</option>"; ?>
        </select>
        <textarea name="secretary_list" rows="8" placeholder="ms_cruz
mr_santos
ms_reyes
mr_lim
ms_garcia">ms_cruz
mr_santos
ms_reyes</textarea>
        <button name="bulk_create">Create All Secretaries!</button>
    </form>
    
    <!-- Active Secretaries -->
    <h3>📋 Active Secretaries</h3>
    <table>
        <tr><th>Username</th><th>School</th><th>Scans Today</th><th>Status</th></tr>
        <?php
        $stmt = $pdo->query("
            SELECT u.username, s.name, 
                   (SELECT COUNT(*) FROM attendance a WHERE a.scanned_by=u.id AND DATE(a.scanned_at)=CURDATE()) as scans
            FROM users u JOIN schools s ON u.school_id=s.id 
            WHERE u.role='secretary' AND u.is_active=1
        ");
        foreach($stmt as $sec){
            $status = $sec['scans']>0 ? '🟢 Active' : '🔴 Idle';
            echo "<tr><td>{$sec['username']}</td><td>{$sec['name']}</td><td>{$sec['scans']}</td><td>$status</td></tr>";
        }
        ?>
    </table>
    <a href="logout.php">🚪 Logout</a>
</body>
</html>
