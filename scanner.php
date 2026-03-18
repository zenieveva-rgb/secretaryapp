<?php
require_once 'config.php';
requireSecretary($pdo);

$stmt = $pdo->prepare("SELECT name FROM schools WHERE id = ?");
$stmt->execute([$_SESSION['school_id']]);
$school = $stmt->fetchColumn();
?>
<!DOCTYPE html>
<html>
<head>
    <title>📱 <?= $school ?> Scanner</title>
    <script src="https://unpkg.com/@zxing/library@latest/umd/index.min.js"></script>
    <style>body{font-family:Arial;text-align:center;padding:20px;background:#f0f2f5;}#scanner{width:100%;max-width:500px;border:5px solid #28a745;border-radius:10px;}#result{font-size:24px;margin:20px;font-weight:bold;min-height:80px;}.btn{padding:12px 24px;margin:10px;border-radius:25px;text-decoration:none;color:white;background:#007bff;display:inline-block;}.stats{background:white;padding:20px;border-radius:10px;margin:20px auto;max-width:500px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}</style>
</head>
<body>
    <h1>📱 <?= $school ?> - <?= $_SESSION['username'] ?> Scanner</h1>
    <video id="scanner" autoplay muted playsinline></video>
    <div id="result">🎯 Point at student QR code...</div>
    
    <div class="stats">
        <div>✅ Success: <span id="success">0</span> | ❌ Error: <span id="error">0</span></div>
    </div>
    
    <a href="dashboard.php" class="btn">📊 Dashboard</a>
    <a href="logout.php" class="btn" style="background:#dc3545">🚪 Logout</a>

    <script>
        fetch('api/verify-secretary.php').then(r=>r.json()).then(d=>{
            if(!d.authorized){alert('🚫 Unauthorized!');location.href='login.php';}
        });

        let codeReader = new ZXing.BrowserMultiFormatReader();
        let success=0, error=0;
        
        codeReader.decodeFromVideoDevice(null, 'scanner', (result, err)=>{
            if(result){
                document.getElementById('result').innerHTML='🔍 Checking...';
                fetch('api/mark-attendance.php',{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({student_qr:result.text,scanned_by:<?= $_SESSION['user_id'] ?>,school_id:<?= $_SESSION['school_id'] ?>})
                }).then(r=>r.json()).then(d=>{
                    if(d.success){
                        success++; 
                        document.getElementById('result').innerHTML='✅ '+result.text+' marked present!';
                        document.getElementById('success').textContent=success;
                    }else{
                        error++;
                        document.getElementById('result').innerHTML='❌ '+d.error;
                        document.getElementById('error').textContent=error;
                    }
                });
                setTimeout(()=>codeReader.reset(),1500);
            }
        });
    </script>
</body>
</html>
