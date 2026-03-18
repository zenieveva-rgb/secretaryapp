<?php
require_once '../config.php';
header('Content-Type: application/json');

requireSecretary($pdo);

$input = json_decode(file_get_contents('php://input'), true);
$student_qr = trim($input['student_qr'] ?? '');

if(empty($student_qr)){
    echo json_encode(['success'=>false, 'error'=>'No QR code detected']);
    exit();
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND school_id = ? AND role = 'student'");
$stmt->execute([$student_qr, $_SESSION['school_id']]);
$student = $stmt->fetch();

if(!$student){
    echo json_encode(['success'=>false, 'error'=>'Student not found in this school']);
    exit();
}

$stmt = $pdo->prepare("INSERT INTO attendance (student_id, school_id, scanned_by) VALUES (?, ?, ?)");
$stmt->execute([$student['id'], $_SESSION['school_id'], $_SESSION['user_id']]);

echo json_encode(['success'=>true]);
?>
