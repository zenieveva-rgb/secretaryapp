import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. GLOBAL STATE ---
let isProcessing = false;
let html5QrCode = null;

// --- 3. SIGN UP LOGIC ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('newEmail').value;
        const user = document.getElementById('newUsername').value;
        const pass = document.getElementById('newPassword').value;

        set(ref(db, 'users/' + user), {
            email: email,
            password: pass
        }).then(() => {
            alert("Account created successfully!");
            window.location.href = "index.html"; 
        }).catch((err) => alert("Error: " + err.message));
    });
}

// --- 4. LOGIN LOGIC ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        get(child(ref(db), `users/${user}`)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().password === pass) {
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('qr-container').style.display = 'flex';
                startScanner();
            } else {
                alert("Invalid Username or Password");
            }
        }).catch((err) => alert("Login Error: " + err.message));
    });
}

// --- 5. SCANNER LOGIC ---
function startScanner() {
    if (html5QrCode) html5QrCode.stop().catch(() => {});
    
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        if (isProcessing) return;
        isProcessing = true;

        const parts = decodedText.split('|');
        const lrn = parts[0]?.trim() || "N/A";
        const fullName = parts[1]?.trim() || "Unknown";
        const grade = parts[2]?.trim() || "N/A";

        const timeString = new Date().toLocaleString();

        push(ref(db, 'attendance'), {
            lrn, studentName: fullName, grade, scannedAt: timeString
        }).then(() => {
            alert(`✅ Logged: ${fullName}`);
            setTimeout(() => { isProcessing = false; }, 3000);
        });
    }).catch(err => console.error("Camera error:", err));
}

// --- 6. LOGOUT ---
document.getElementById('logout-btn')?.addEventListener('click', () => {
    location.reload();
});
