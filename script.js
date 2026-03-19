import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ✅ YOUR NEW SECURE FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBU4Mvwjuv2HOscvYyQT4UwHNsyoXIr6Kw",
  authDomain: "school-secretary-app.firebaseapp.com",
  databaseURL: "https://school-secretary-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "school-secretary-app",
  storageBucket: "school-secretary-app.firebasestorage.app",
  messagingSenderId: "507429367336",
  appId: "1:507429367336:web:796e381a780a33ef98cf1d",
  measurementId: "G-5ZQE5M1SWC"
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
    if (!toast) return;
    
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
    setTimeout(() => toast.classList.remove('show'), 4000);
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

// ==================== SIGNUP (PENDING REQUESTS) ====================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('signupBtn', true);
        
        const email = document.getElementById('newEmail').value.trim();
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const fullName = document.getElementById('fullName')?.value.trim();
        const employeeId = document.getElementById('employeeId')?.value.trim();

        try {
            // Check duplicates
            const existingRequest = await get(ref(db, `pendingRequests/${username}`));
            const existingUser = await get(ref(db, `users/${username}`));
            
            if (existingRequest.exists() || existingUser.exists()) {
                showToast('Username already exists/requested!', 'error');
                setLoading('signupBtn', false);
                return;
            }

            // Store PENDING request
            await set(ref(db, `pendingRequests/${username}`), {
                email, username, password, fullName: fullName || 'N/A', 
                employeeId: employeeId || 'N/A',
                requestedAt: new Date().toLocaleString('en-PH'),
                status: 'pending'
            });
            
            showToast(`✅ Request sent! Admin will review (ID: ${username})`);
            signupForm.reset();
            setLoading('signupBtn', false);
            
        } catch (error) {
            showToast('Request failed', 'error');
            setLoading('signupBtn', false);
        }
    });
}

// ==================== LOGIN ====================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading('loginBtn', true);
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            const snapshot = await get(ref(db, `users/${username}`));
            
            if (snapshot.exists() && snapshot.val().password === password && snapshot.val().approved === true) {
                currentUser = username;
                sessionStorage.setItem('currentUser', username);
                showToast('Login successful!');
                
                // Admin vs Secretary redirect
                if (snapshot.val().role === 'admin') {
                    setTimeout(() => window.location.href = 'admin.html', 800);
                } else {
                    setTimeout(() => window.location.href = 'scanner.html', 800);
                }
            } else {
                showToast('Invalid credentials or pending approval', 'error');
            }
            setLoading('loginBtn', false);
        } catch (error) {
            showToast('Login failed', 'error');
            setLoading('loginBtn', false);
        }
    });
}

// ==================== SCANNER ====================
function startScanner() {
    if (!document.getElementById('qr-reader')) return;
    
    currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        showToast('Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }
    
    if (html5QrCode) html5QrCode.stop().catch(() => {});
    
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const [lrn, studentName, grade] = decodedText.split('|');
                
                await push(ref(db, 'attendance'), {
                    lrn: lrn || 'N/A',
                    studentName: studentName || 'Unknown',
                    grade: grade || 'N/A',
                    scannedAt: new Date().toISOString(),
                    scannedBy: currentUser
                });
                
                addScanToList(studentName || 'Unknown', grade || 'N/A');
                updateStats();
                showToast(`✅ Logged: ${studentName}`);
                
            } catch (error) {
                showToast('Scan failed', 'error');
            } finally {
                setTimeout(() => isProcessing = false, 1500);
            }
        },
        () => {}
    ).catch(() => showToast('Camera access denied', 'error'));
}

function addScanToList(name, grade) {
    const list = document.getElementById('scan-list');
    if (!list) return;
    
    const item = document.createElement('div');
    item.className = 'scan-item';
    item.innerHTML = `
        <div class="scan-icon"><i class="fas fa-user-check"></i></div>
        <div class="scan-info">
            <div class="scan-name">${name}</div>
            <div class="scan-time">${grade} • ${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    list.insertBefore(item, list.firstChild);
    while (list.children.length > 5) list.removeChild(list.lastChild);
}

function updateStats() {
    scanCount++;
    document.getElementById('scan-count')?.textContent = scanCount;
    document.getElementById('last-scan')?.textContent = new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
}

// ==================== UTILITIES ====================
window.togglePassword = (inputId, button) => {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
};

window.emergencyLogout = () => {
    sessionStorage.clear();
    if (html5QrCode) html5QrCode.stop();
    showToast('Logged out');
    setTimeout(() => window.location.href = 'index.html', 800);
};

window.pauseScanner = () => {
    if (html5QrCode) {
        html5QrCode.stop();
        showToast('Scanner paused');
    }
};

// ==================== ADMIN FUNCTIONS ====================
window.approveUser = async (username) => {
    try {
        const data = (await get(ref(db, `pendingRequests/${username}`))).val();
        if (data) {
            await set(ref(db, `users/${username}`), {...data, approved: true, approvedAt: new Date().toISOString()});
            await remove(ref(db, `pendingRequests/${username}`));
            showToast(`✅ Approved: ${data.fullName}`);
        }
    } catch (e) {
        showToast('Approval failed', 'error');
    }
};

window.rejectUser = async (username) => {
    await remove(ref(db, `pendingRequests/${username}`));
    showToast('❌ Rejected');
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('qr-reader')) setTimeout(startScanner, 500);
});
window.addEventListener('beforeunload', () => html5QrCode?.stop());
