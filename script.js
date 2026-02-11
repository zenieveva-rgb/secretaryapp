// --- 1. SIGN UP LOGIC (Kept exactly as yours) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const email = document.getElementById('newEmail').value;
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        const userData = {
            email: email,
            username: username,
            password: password
        };

        localStorage.setItem('registeredUser', JSON.stringify(userData));
        alert("Account created successfully! Redirecting to login...");
        window.location.href = "login.html"; 
    });
}

// --- 2. LOGIN LOGIC (Enhanced to hide headers) ---
const loginForm = document.getElementById('loginForm');
const qrContainer = document.getElementById('qr-container');

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        const savedData = JSON.parse(localStorage.getItem('registeredUser'));

        if (savedData && userIn === savedData.username && passIn === savedData.password) {
            alert("Login Successful! Opening QR Scanner...");
            
            // Hide the login elements
            loginForm.style.display = "none";
            document.querySelector('.glass-card h2').style.display = "none";
            document.querySelector('.glass-card p').style.display = "none";
            
            // Show scanner and start camera
            qrContainer.style.display = "block";
            startScanner();
        } else {
            alert("Invalid Username or Password.");
        }
    });
}

// --- 3. SCANNER LOGIC (Upgraded for History & Android Compatibility) ---
function startScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    // Config optimized for speed and the scan-line animation
    const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        const details = decodedText.split(","); 
        
        let studentID, studentName, studentGrade;

        if (details.length >= 2) {
            studentID = details[0].trim();
            studentName = details[1].trim();
            studentGrade = details[2] ? details[2].trim() : "N/A";
        } else {
            studentName = decodedText.trim();
            studentID = "N/A";
            studentGrade = "General";
        }

        const currentTime = new Date().toLocaleTimeString();
        const today = new Date().toISOString().split('T')[0]; // Format: 2026-02-06

        // SAVE TO FIREBASE 
        // We use /history/DATE so the Android App can show a list, not just 1 name!
        database.ref('attendance/' + studentName + '/history/' + today).set({
            id: studentID,
            name: studentName,
            grade: studentGrade,
            time: currentTime,
            date: today
        }).then(() => {
            // SUCCESS FEEDBACK
            console.log("Data sent to Firebase for " + studentName);
            alert("Logged: " + studentName + " at " + currentTime);
        }).catch(err => {
            alert("Firebase Error: " + err.message);
        });

    }).catch(err => {
        console.error("Scanner error:", err);
    });
}

// --- 4. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        location.reload(); 
    });
}