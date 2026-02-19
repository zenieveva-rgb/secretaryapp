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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. GLOBAL VARIABLES ---
let isProcessing = false; // Flag to prevent multiple simultaneous saves

// --- 3. UI ELEMENTS ---
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const qrContainer = document.getElementById('qr-container');
const loginSection = document.getElementById('login-section');

// --- 4. SIGNUP LOGIC ---
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userData = {
            email: document.getElementById('newEmail').value,
            username: document.getElementById('newUsername').value,
            password: document.getElementById('newPassword').value
        };
        localStorage.setItem('registeredUser', JSON.stringify(userData));
        alert("Account Created! Redirecting to Login...");
        
        // FIXED: Redirects to index.html instead of login.html to avoid 404
        window.location.href = "index.html"; 
    });
}

// --- 5. LOGIN LOGIC ---
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        const savedData = JSON.parse(localStorage.getItem('registeredUser'));

        if (savedData && userIn === savedData.username && passIn === savedData.password) {
            loginSection.style.display = "none";
            qrContainer.style.display = "flex";
            startScanner();
        } else {
            alert("Invalid Credentials. Please register first.");
        }
    });
}

// --- 6. THE SCANNER LOGIC ---
function startScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

   html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
    if (isProcessing) return; 

    // 1. Split the data
    const parts = decodedText.split('|');

    // 2. Assign variables but SKIP parts[0] (The LRN)
    // parts[0] is the LRN (Ignored)
    // parts[1] is the Full Name
    // parts[2] is the Grade/Section
    let fullName = parts[1] ? parts[1].trim() : null;
    let gradeSection = parts[2] ? parts[2].trim() : "N/A";

    // 3. Save to Firebase (LRN is NOT included here)
    if (fullName && fullName !== "") {
        isProcessing = true; 

        const now = new Date();
        const timeString = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        database.ref('attendance').push({
            studentName: fullName, // This goes to your "NAME" column
            grade: gradeSection,   // This goes to your "GRADE" column
            scannedAt: timeString  // This goes to your "TIME" column
        })
        .then(() => {
            alert(`✅ LOGGED: ${fullName}`);
            setTimeout(() => { isProcessing = false; }, 3000);
        })
        .catch(err => {
            console.error("Firebase Error:", err);
            isProcessing = false;
        });
    }
});

// --- 7. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.location.reload(); 
    });
}
