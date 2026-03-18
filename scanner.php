<?php
require_once 'config.php';
requireSecretary($pdo);

// Get school & stats
$school_stmt = $pdo->prepare("SELECT name FROM schools WHERE id = ?");
$school_stmt->execute([$_SESSION['school_id']]);
$school = $school_stmt->fetch();

$scans_stmt = $pdo->prepare("SELECT COUNT(*) FROM attendance WHERE scanned_by = ? AND DATE(scanned_at) = CURDATE()");
$scans_stmt->execute([$_SESSION['user_id']]);
$today_scans = $scans_stmt->fetchColumn();
?>
<!DOCTYPE html>
<html>
<head>
    <title>📱 <?= $school['name'] ?> Scanner - <?= $_SESSION['username'] ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://unpkg.com/@zxing/library@latest/umd/index.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; text-align: center; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 15px; margin-bottom: 20px; }
        #scanner { width: 100%; max-width: 500px; border: 5px solid #28a745; border-radius: 15px; background: #000; }
        #result { margin: 20px; font-size: 24px; font-weight: bold; min-height: 60px; }
        .stats { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 24px; margin: 10px; border-radius: 25px; text-decoration: none; font-weight: bold; transition: all 0.3s; }
        .btn-primary { background: #007bff; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .success { color: #28a745; }
        .loading { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 <?= $school['name'] ?></h1>
        <p>👤 <?= $_SESSION['username'] ?> | 📊 Today: <?= $today_scans ?> scans</p>
    </div>
    
    <video id="scanner" autoplay muted playsinline></video>
    <div id="result">🎯 Point camera at student QR code...</div>
    
    <div class="stats">
        <div>✅ <span id="success-count">0</span> successful scans</div>
        <div>❌ <span id="error-count">0</span> errors</div>
    </div>
    
    <a href="dashboard.php" class="btn btn-primary">📈 Dashboard</a>
    <a href="logout.php" class="btn btn-danger">🚪 Logout</a>

    <script>
        // Double-check authorization
        fetch('api/verify-secretary.php')
            .then(res => res.json())
            .then(data => {
                if (!data.authorized) {
                    alert('🚫 Access denied! Logging out...');
                    window.location.href = 'login.php';
                }
            });

        let codeReader = new ZXing.BrowserMultiFormatReader();
        let successCount = 0, errorCount = 0;
        
        codeReader.decodeFromVideoDevice(
            null, 'scanner',
            function(result, err) {
                if (result) {
                    const studentId = result.text;
                    document.getElementById('result').innerHTML = `🔍 Verifying ${studentId}...`;
                    
                    // Mark attendance
                    fetch('api/mark-attendance.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_qr: studentId,
                            scanned_by: <?= $_SESSION['user_id'] ?>,
                            school_id: <?= $_SESSION['school_id'] ?>
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            successCount++;
                            document.getElementById('result').innerHTML = `✅ ${studentId} marked present!`;
                            document.getElementById('success-count').textContent = successCount;
                        } else {
                            errorCount++;
                            document.getElementById('result').innerHTML = `❌ Error: ${data.error}`;
                            document.getElementById('error-count').textContent = errorCount;
                        }
                    })
                    .catch(() => {
                        errorCount++;
                        document.getElementById('error-count').textContent = errorCount;
                    });
                    
                    // Reset for next scan
                    setTimeout(() => codeReader.reset(), 2000);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                }
            }
        ).catch(err => {
            document.getElementById('result').innerHTML = '❌ Camera error. Check permissions.';
        });
    </script>
</body>
</html>
