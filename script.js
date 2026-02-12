// --- 1. FIREBASE CONFIGURATION (From your Screenshot) ---
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. SIGNUP LOGIC (Saves to Firebase) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const email = document.getElementById('newEmail').value;
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        // Save to Firebase under 'users' folder
        database.ref('users/' + username).set({
            email: email,
            username: username,
            password: password
        }).then(() => {
            alert("Account created successfully! Redirecting to login...");
            window.location.href = "index.html"; 
        }).catch(err => {
            alert("Error: " + err.message);
        });
    });
}

// --- 3. LOGIN LOGIC (Checks Firebase) ---
const loginForm = document.getElementById('loginForm');
const qrContainer = document.getElementById('qr-container');
const loginSection = document.getElementById('login-section');

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        
        database.ref('users/' + userIn).once('value').then((snapshot) => {
            const userData = snapshot.val();
            if (userData && userData.password === passIn) {
                alert("Login Successful!");
                loginSection.style.display = "none";
                qrContainer.style.display = "flex";
                startScanner();
            } else {
                alert("Invalid Username or Password.");
            }
        });
    });
}

// --- 4. SCANNER LOGIC (Saves Attendance to Firebase) ---
function startScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        const details = decodedText.split(","); 
        let studentID = details[0]?.trim() || "N/A";
        let studentName = details[1]?.trim() || details[0]?.trim();
        let studentGrade = details[2]?.trim() || "N/A";

        // Realtime Database Push
        database.ref('attendance').push({
            lrn: studentID,
            displayName: studentName,
            grade: studentGrade,
            timestamp: Date.now()
        }).then(() => {
            alert("✅ Logged: " + studentName);
        }).catch(err => {
            alert("Firebase Error: " + err.message);
        });

    }).catch(err => {
        console.error("Scanner error:", err);
    });
}

// --- 5. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        location.reload(); 
    });
}
