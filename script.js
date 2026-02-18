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
        alert("Account Created! Redirecting to login...");
        window.location.href = "login.html";
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

// --- 6. THE SCANNER (READY TO PASTE) ---
function startScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        // Stop if we are already processing a scan
        if (isProcessing) return; 

        // Split text by comma, pipe, or new line
        const parts = decodedText.split(/[,|\n]/);

        // We assume index [0] is LRN (ignored), [1] is Name, [2] is Grade
        // Clean labels like "Name:" or "LRN:" using regex replace
        let fullName = parts[1] ? parts[1].replace(/.*:/, "").trim() : null;
        let gradeSection = parts[2] ? parts[2].replace(/.*:/, "").trim() : "N/A";

        // Only proceed if a name was actually found
        if (fullName && fullName !== "undefined" && fullName !== "") {
            isProcessing = true; // Lock the scanner

            const now = new Date();
            const timeString = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            database.ref('attendance').push({
                studentName: fullName,
                grade: gradeSection,
                scannedAt: timeString
            })
            .then(() => {
                console.log("Saved to Firebase:", fullName);
                alert(`✅ ATTENDANCE LOGGED\nName: ${fullName}\nGrade: ${gradeSection}`);
                
                // Wait 3 seconds before allowing the next scan
                setTimeout(() => { isProcessing = false; }, 3000);
            })
            .catch(err => {
                alert("Database Error: " + err.message);
                isProcessing = true; // Keep locked on error or handle as needed
            });
        }
    }).catch(err => console.error("Scanner Error:", err));
}

// --- 7. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.location.reload(); 
    });
}

// --- 8. GENERATOR LOGIC (In case this script is used on the generator page) ---
function generateQR() {
    const lrnInput = document.getElementById('lrn')?.value.trim();
    const fullName = document.getElementById('fullname')?.value.trim();
    const gradeSection = document.getElementById('gradeSection')?.value.trim();
    const qrcodeDiv = document.getElementById('qrcode');

    if (!lrnInput || !fullName) return;

    qrcodeDiv.innerHTML = "";
    // Format: LRN,Name,Grade (This ensures the scanner index [1] and [2] are correct)
    const qrData = `${lrnInput},${fullName},${gradeSection}`;

    const qrcode = new QRCode(qrcodeDiv, {
        text: qrData,
        width: 256,
        height: 256,
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const qrImg = qrcodeDiv.querySelector('img').src;
        const link = document.createElement("a");
        link.href = qrImg;
        link.download = `${fullName}_QR.png`;
        link.click();
    }, 500);
}
