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

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 2. SIGNUP LOGIC (Runs on signup.html) ---
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userData = {
            email: document.getElementById('newEmail').value,
            username: document.getElementById('newUsername').value,
            password: document.getElementById('newPassword').value
        };

        // Save locally for the browser to remember
        localStorage.setItem('registeredUser', JSON.stringify(userData));
        
        alert("Account Created Successfully! Redirecting to Login...");
        
        // Go back to the main page (index.html)
        window.location.href = "index.html"; 
    });
}

// --- 3. LOGIN LOGIC (Runs on index.html) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        
        // Try to get the data we saved during signup
        const savedData = JSON.parse(localStorage.getItem('registeredUser'));

        if (savedData && userIn === savedData.username && passIn === savedData.password) {
            // Hide login, show scanner
            const loginSection = document.getElementById('login-section');
            const qrContainer = document.getElementById('qr-container');
            
            if (loginSection) loginSection.style.display = "none";
            if (qrContainer) qrContainer.style.display = "flex";
            
            // Start the scanner function (if you have it defined below)
            if (typeof startScanner === 'function') {
                startScanner();
            }
        } else {
            alert("Invalid Credentials. Please sign up first.");
        }
    });
}
