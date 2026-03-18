import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase Config
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

// --- SIGNUP LOGIC ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newEmail').value;
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        try {
            // Check if username already exists
            const snapshot = await get(child(ref(db), `users/${username}`));
            if (snapshot.exists()) {
                alert("❌ Username already exists!");
                return;
            }

            // Create new user
            await set(ref(db, 'users/' + username), {
                email: email,
                password: password,
                createdAt: new Date().toLocaleString()
            });
            
            alert("✅ Account created successfully! Redirecting to login...");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Signup Error:", error);
            alert("❌ Signup failed: " + error.message);
        }
    });
}

// --- LOGIN LOGIC ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const snapshot = await get(child(ref(db), `users/${username}`));
            
            if (snapshot.exists() && snapshot.val().password === password) {
                // Success: Hide login, show scanner
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('qr-container').style.display = 'flex';
                startScanner();
            } else {
                alert("❌ Invalid Username or Password");
                document.getElementById('password').value = ''; // Clear password
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("❌ Login failed: " + error.message);
        }
    });
}

// --- QR SCANNER LOGIC ---
let isProcessing = false;
let html5QrCode = null;

function startScanner() {
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
    }
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 250, height: 250 } }, 
        async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const parts = decodedText.split('|');
                await push(ref(db, 'attendance'), {
                    lrn: parts[0] || "N/A",
                    studentName: parts[1] || "Unknown",
                    grade: parts[2] || "N/A",
                    scannedAt: new Date().toLocaleString()
                });
                
                alert("✅ Logged: " + (parts[1] || "Student"));
            } catch (error) {
                console.error("Scan Error:", error);
                alert("❌ Scan failed: " + error.message);
            } finally {
                setTimeout(() => { isProcessing = false; }, 3000);
            }
        },
        (error) => {
            console.log("Scan error:", error);
        }
    ).catch(err => {
        console.error("Scanner start error:", err);
        alert("❌ Camera access denied or failed");
    });
}

// --- LOGOUT ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => {});
        }
        location.reload();
    });
}
