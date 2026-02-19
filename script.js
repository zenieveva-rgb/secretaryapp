import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// --- 2. SIGN UP LOGIC (Run only on signup.html) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('newEmail').value;
        const user = document.getElementById('newUsername').value;
        const pass = document.getElementById('newPassword').value;

        // Save user to Firebase
        set(ref(db, 'users/' + user), {
            email: email,
            password: pass
        }).then(() => {
            alert("Account created! Redirecting to login...");
            window.location.href = "index.html"; 
        }).catch((err) => alert("Error: " + err.message));
    });
}

// --- 3. LOGIN LOGIC (Run only on index.html) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        get(child(ref(db), `users/${user}`)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().password === pass) {
                // Success: Switch UI
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('qr-container').style.display = 'flex';
                startScanner();
            } else {
                alert("Invalid Username or Password");
            }
        }).catch((err) => alert("Login Error: " + err.message));
    });
}

// --- 4. SCANNER LOGIC ---
let isProcessing = false;
let html5QrCode = null;

function startScanner() {
    if (html5QrCode) html5QrCode.stop().catch(() => {});
    html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 250, height: 250 } }, 
        (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;

            const parts = decodedText.split('|');
            push(ref(db, 'attendance'), {
                lrn: parts[0] || "N/A",
                studentName: parts[1] || "Unknown",
                grade: parts[2] || "N/A",
                scannedAt: new Date().toLocaleString()
            }).then(() => {
                alert("✅ Logged: " + (parts[1] || "Student"));
                setTimeout(() => { isProcessing = false; }, 3000);
            });
        }
    ).catch(err => console.error(err));
}

// Logout button
document.getElementById('logout-btn')?.addEventListener('click', () => location.reload());
