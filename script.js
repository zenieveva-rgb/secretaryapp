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
let html5QrCode = null;
let isProcessing = false;

// --- 3. LOGIN LOGIC ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        const savedData = JSON.parse(localStorage.getItem('registeredUser'));

        if (savedData && userIn === savedData.username && passIn === savedData.password) {
            // Show Scanner Section
            document.getElementById('login-section').style.display = "none";
            const qrContainer = document.getElementById('qr-container');
            qrContainer.style.display = "flex";
            
            // Wait 500ms to ensure the container is rendered before starting camera
            setTimeout(() => { 
                startScanner(); 
            }, 500);
        } else {
            alert("Invalid Credentials. Please sign up first.");
        }
    });
}

// --- 4. SCANNER LOGIC ---
function startScanner() {
    // If a scanner is already active, stop it
    if (html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
    }

    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
            if (isProcessing) return; 

            // Split the data: format is LRN|Name|Grade
            const parts = decodedText.split('|');

            // SKIP parts[0] (LRN)
            // Name is parts[1], Grade is parts[2]
            let fullName = parts[1] ? parts[1].trim() : null;
            let gradeSection = parts[2] ? parts[2].trim() : "N/A";

            if (fullName && fullName !== "") {
                isProcessing = true; 

                const now = new Date();
                const timeString = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Push to Firebase
                database.ref('attendance').push({
                    studentName: fullName,
                    grade: gradeSection,
                    scannedAt: timeString
                })
                .then(() => {
                    alert(`✅ LOGGED: ${fullName}\nGrade: ${gradeSection}`);
                    // Cooldown to prevent double scanning
                    setTimeout(() => { isProcessing = false; }, 3000);
                })
                .catch(err => {
                    console.error("Firebase Error:", err);
                    isProcessing = false;
                });
            }
        }
    ).catch(err => {
        console.error("Camera Start Error:", err);
        alert("Camera failed to start. Check permissions or ensure you are on HTTPS.");
    });
}

// --- 5. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    });
}
