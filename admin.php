<?php
require_once 'config.php';
requireAdmin($pdo);

if ($_POST['create_secretary']) {
    $username = trim($_POST['username']);
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $school_id = $_POST['school_id'];
    
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role, school_id) VALUES (?, ?, ?, 'secretary', ?)");
    $stmt->execute([$username, $email, $password, $school_id]);
    $success = "✅ Secretary '$username' created!";
}

if ($_POST['bulk_create']) {
    $secretaries = explode("\n", $_POST['secretary_list']);
    $count = 0;
    foreach($secretaries as $sec) {
        $sec = trim($sec);
        if (!empty($sec) && strlen($sec) > 2) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO users (username, email, password, role, school_id) VALUES (?, ?, ?, 'secretary', ?)");
            $stmt->execute([$sec, $sec.'@school.com', password_hash('123456', PASSWORD_DEFAULT), $_POST['school_id']]);
            $count++;
        }
    }
    $success = "✅ Created $count secretaries!";
}
?>
<!DOCTYPE html>
<html>
<head><title>👑 Admin Panel</title><style>body{font-family:Arial;padding:20px;}input,textarea,select{width:100%;padding:10px;margin:5px 0;}button{padding:10px 20px;background:#28a745;color:white;border:none;cursor:pointer;}</style></head>
<body>
    <h1>👑 Admin Panel - Create Secretaries</h1
