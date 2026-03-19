import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ✅ YOUR SECURE FIREBASE CONFIG
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

// ✅ UNIVERSAL TOAST FUNCTION (works on ALL pages)
function showToast(message, type = 'success') {
    // Create toast if doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas fa-check"></i></div>
            <div>
                <div style="font-weight: 600; margin-bottom: 2px;" id="toast-message">Success!</div>
            </div>
        `;
        document.body.appendChild(toast);
    }
    
    const toastMessage = document.getElementById('toast-message') || toast.querySelector('#toast-message');
    const toastIcon = toast.querySelector('.toast-icon i');
    
    toastMessage.textContent = message;
    
    // Set colors based on type
    if (type === 'error') {
        toast.style.borderColor = '#ff416c';
        toast.style.background = 'rgba(255, 65, 108, 0.95)';
        toastIcon.className = 'fas fa-exclamation-triangle';
        toastIcon.parentElement.style.background = 'rgba(255, 65, 108, 0.2)';
        toastIcon.style.color = '#ff416c';
    } else if (type === 'success') {
        toast.style.borderColor = '#05ffa1';
        toast.style.background = 'rgba(5, 255, 161, 0.95)';
        toastIcon.className = 'fas fa-check-circle';
        toastIcon.parentElement.style.background = 'rgba(5, 255, 161, 0.2)';
        toastIcon.style.color = '#05ffa1';
    } else if (type === 'info') {
        toast.style.borderColor = '#00d4ff';
        toast.style.background = 'rgba(0, 212, 255, 0.95)';
        toastIcon.className = 'fas fa-info-circle';
        toastIcon.parentElement.style.background = 'rgba(0, 212, 255, 0.2)';
        toastIcon.style.color = '#00d4ff';
    }
    
    toast.classList.remove('show');
    // Force reflow
    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function setLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    const spinner = btn.querySelector('.spinner');
    const text = btn.querySelector('span') || btn;
    
    if (loading) {
        if (spinner) spinner.style.display = 'block';
        if (text && text.tagName !== 'BUTTON') text.style.display = 'none';
        btn.disabled = true;
    } else {
        if (spinner) spinner.style.display = 'none';
        if (text && text.tagName !== 'BUTTON') text.style.display = 'block';
        btn.disabled = false;
    }
}

// ==================== SIGNUP ====================
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
            // ✅ Check duplicates
            const existingRequest = await get(ref(db, `pendingRequests/${username}`));
            const existingUser = await get(ref(db, `users/${username}`));
            
            if (existingRequest.exists() || existingUser.exists()) {
                showToast('❌ Username already exists or requested!', 'error');
                setLoading('signupBtn', false);
                return;
            }

            // ✅ Store PENDING request
            await set(ref(db, `pendingRequests/${username}`), {
                email, 
                username, 
                password, 
                fullName: fullName || 'N/A', 
                employeeId: employeeId || 'N/A',
                requestedAt: new Date().toLocaleString('en-PH'),
                status: 'pending'
            });
            
            showToast(`✅ Request saved to database! Admin will review (ID: ${username})`, 'success');
            signupForm.reset();
            setLoading('signupBtn', false);
            
            // Show success screen if exists
            const successScreen = document.getElementById('successScreen');
            if (successScreen) {
                successScreen.style.display = 'flex';
                setTimeout(() => window.location.href = 'index.html', 3000);
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            showToast(`❌ Failed to save to database: ${error.message}`, 'error');
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
            showToast('🔍 Checking database...', 'info');
            
            const snapshot = await get(ref(db, `users/${username}`));
            const pendingSnapshot = await get(ref(db, `pendingRequests/${username}`));
            
            if (pendingSnapshot.exists()) {
                showToast('⏳ Your account is pending admin approval', 'error');
                setLoading('loginBtn', false);
                return;
            }
            
            if (snapshot.exists() && snapshot.val().password === password && snapshot.val().approved === true) {
                currentUser = username;
                sessionStorage.setItem('currentUser', username);
                showToast(`✅ Login successful! Welcome ${snapshot.val().fullName || username}`, 'success');
                
                // Admin vs Secretary redirect
                if (snapshot.val().role === 'admin') {
                    setTimeout(() => window.location.href = 'admin.html', 1000);
                } else {
                    setTimeout(() => window.location.href = 'scanner.html', 1000);
                }
            } else {
                showToast('❌ Invalid credentials or account not approved', 'error');
            }
            setLoading('loginBtn', false);
        } catch (error) {
            console.error('Login error:', error);
            showToast(`❌ Login failed: ${error.message}`, 'error');
            setLoading('loginBtn', false);
        }
    });
}

// ==================== SCANNER ====================
function startScanner() {
    if (!document.getElementById('qr-reader')) return;
    
    currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        showToast('❌ Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
    }
    
    if (html5QrCode) html5QrCode.stop().catch(() => {});
    
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
                showToast(`✅ Logged: ${studentName}`, 'success');
                
            } catch (error) {
                showToast('❌ Scan failed: Invalid QR format', 'error');
            } finally {
                setTimeout(() => isProcessing = false, 2000);
            }
        },
        (error) => {
            console.log('Scanner error:', error);
        }
    ).catch((err) => {
        console.error('Camera start error:', err);
        showToast('❌ Camera access denied. Please enable camera permission.', 'error');
    });
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
    document.getElementById('session-scans')?.textContent = scanCount;
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
    showToast('👋 Logged out successfully');
    setTimeout(() => window.location.href = 'index.html', 800);
};

window.pauseScanner = () => {
    if (html5QrCode) {
        html5QrCode.stop();
        showToast('⏸️ Scanner paused');
    }
};

// ==================== ADMIN FUNCTIONS ====================
window.approveUser = async (username) => {
    try {
        const data = (await get(ref(db, `pendingRequests/${username}`))).val();
        if (data) {
            await set(ref(db, `users/${username}`), {...data, approved: true, role: 'secretary', approvedAt: new Date().toISOString()});
            await remove(ref(db, `pendingRequests/${username}`));
            showToast(`✅ Approved: ${data.fullName}`);
        }
    } catch (e) {
        showToast('❌ Approval failed', 'error');
    }
};

window.rejectUser = async (username) => {
    await remove(ref(db, `pendingRequests/${username}`));
    showToast('❌ Request rejected');
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Auto-start scanner if on scanner page
    if (document.getElementById('qr-reader')) {
        setTimeout(startScanner, 500);
    }
    
    // Load user info on scanner page
    if (document.getElementById('current-user-name')) {
        currentUser = sessionStorage.getItem('currentUser');
        if (currentUser) {
            document.getElementById('current-user-name').textContent = currentUser;
            document.getElementById('user-info-card').style.display = 'flex';
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (html5QrCode) html5QrCode.stop();
});
