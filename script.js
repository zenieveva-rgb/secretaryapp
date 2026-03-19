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

// Global Variables
let html5QrCode = null;
let isProcessing = false;
let scanCount = 0;
let currentUser = null;

// Utility Functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon i');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.style.borderColor = '#ff416c';
        toastIcon.className = 'fas fa-exclamation-circle';
        toastIcon.parentElement.style.background = 'rgba(255, 65, 108, 0.2)';
        toastIcon.style.color = '#ff416c';
    } else {
        toast.style.borderColor = 'var(--success)';
        toastIcon.className = 'fas fa-check';
        toastIcon.parentElement.style.background = 'rgba(5, 255, 161, 0.2)';
        toastIcon.style.color = 'var(--success)';
    }
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    const spinner = btn.querySelector('.spinner');
    const text = btn.querySelector('span');
    
    if (loading) {
        if (spinner) spinner.style.display = 'block';
        if (text) text.style.display = 'none';
        btn.disabled = true;
    } else {
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.display = 'block';
        btn.disabled = false;
    }
}

// Signup Logic
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('signupBtn', true);
        
        const email = document.getElementById('newEmail').value;
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        try {
            const snapshot = await get(child(ref(db), `users/${username}`));
            if (snapshot.exists()) {
                showToast('Username already exists!', 'error');
                setLoading('signupBtn', false);
                return;
            }

            await set(ref(db, 'users/' + username), {
                email: email,
                password: password,
                createdAt: new Date().toLocaleString()
            });
            
            showToast('Account created successfully!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            console.error("Signup Error:", error);
            showToast('Signup failed: ' + error.message, 'error');
            setLoading('signupBtn', false);
        }
    });
}

// Login Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('loginBtn', true);
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const snapshot = await get(child(ref(db), `users/${username}`));
            
            if (snapshot.exists() && snapshot.val().password === password) {
                currentUser = username;
                sessionStorage.setItem('currentUser', username);
                showToast('Login successful!');
                setTimeout(() => {
                    window.location.href = 'scanner.html';
                }, 800);
            } else {
                showToast('Invalid credentials', 'error');
                setLoading('loginBtn', false);
                document.getElementById('password').value = '';
            }
        } catch (error) {
            console.error("Login Error:", error);
            showToast('Login failed: ' + error.message, 'error');
            setLoading('loginBtn', false);
        }
    });
}

// Scanner Logic
function startScanner() {
    if (!document.getElementById('qr-reader')) return;
    
    // Check if user is logged in
    currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        showToast('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return;
    }
    
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
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
        async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const parts = decodedText.split('|');
                const lrn = parts[0] || "N/A";
                const studentName = parts[1] || "Unknown";
                const grade = parts[2] || "N/A";
                
                // Save to Firebase
                await push(ref(db, 'attendance'), {
                    lrn: lrn,
                    studentName: studentName,
                    grade: grade,
                    scannedAt: new Date().toISOString(),
                    scannedBy: currentUser
                });
                
                // Update UI
                addScanToList(studentName, grade);
                updateStats();
                showToast(`Logged: ${studentName}`);
                
            } catch (error) {
                console.error("Scan Error:", error);
                showToast('Scan failed', 'error');
            } finally {
                setTimeout(() => { isProcessing = false; }, 2000);
            }
        },
        (error) => {
            // console.log("Scan error:", error);
        }
    ).catch(err => {
        console.error("Scanner start error:", err);
        showToast('Camera access denied', 'error');
    });
}

function addScanToList(name, grade) {
    const list = document.getElementById('scan-list');
    if (!list) return;
    
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const item = document.createElement('div');
    item.className = 'scan-item';
    item.innerHTML = `
        <div class="scan-icon">
            <i class="fas fa-user-check"></i>
        </div>
        <div class="scan-info">
            <div class="scan-name">${name}</div>
            <div class="scan-time">${grade} • ${time}</div>
        </div>
    `;
    
    list.insertBefore(item, list.firstChild);
    
    // Keep only last 5 scans
    while (list.children.length > 5) {
        list.removeChild(list.lastChild);
    }
}

function updateStats() {
    scanCount++;
    const countEl = document.getElementById('scan-count');
    const timeEl = document.getElementById('last-scan');
    
    if (countEl) countEl.textContent = scanCount;
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => {});
            html5QrCode = null;
        }
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        scanCount = 0;
        showToast('Logged out successfully');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    });
}

// Initialize scanner if on scanner page
if (document.getElementById('qr-reader')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure DOM is fully ready
        setTimeout(startScanner, 500);
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
    }
});
