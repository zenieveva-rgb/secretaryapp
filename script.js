import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ✅ YOUR REAL DATABASE (schoolsecurity-fe9c9)
const firebaseConfig = {
  apiKey: "AIzaSyA0vXvXz8qXz8qXz8qXz8qXz8qXz8qXz8", // ← YOUR REAL KEYS HERE
  authDomain: "schoolsecurity-fe9c9.firebaseapp.com",
  databaseURL: "https://schoolsecurity-fe9c9-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "schoolsecurity-fe9c9",
  storageBucket: "schoolsecurity-fe9c9.appspot.com",
  messagingSenderId: "507429367336", 
  appId: "1:507429367336:web:YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// SAFE PATHS (won't conflict with existing data)
const PATHS = {
  pendingRequests: 'secretary/pendingRequests',
  users: 'secretary/users', 
  attendance: 'secretary/attendance'
};

// Universal Toast (works everywhere)
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas fa-check"></i></div>
            <div id="toast-message">${message}</div>
        `;
        document.body.appendChild(toast);
    }
    
    const msgEl = document.getElementById('toast-message') || toast.querySelector('#toast-message');
    const icon = toast.querySelector('i');
    msgEl.textContent = message;
    
    if (type === 'error') {
        toast.style.borderColor = '#ff416c';
        icon.className = 'fas fa-exclamation-triangle';
    } else {
        toast.style.borderColor = '#05ffa1';
        icon.className = 'fas fa-check-circle';
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
        spinner.style.display = 'block';
        text.style.display = 'none';
        btn.disabled = true;
    } else {
        spinner.style.display = 'none';
        text.style.display = 'block';
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
        const username = document.getElementById('newUsername').value.trim().toLowerCase();
        const password = document.getElementById('newPassword').value;
        const fullName = document.getElementById('fullName')?.value.trim();
        const employeeId = document.getElementById('employeeId')?.value.trim();

        try {
            // Check if exists
            const existing = await get(ref(db, `${PATHS.pendingRequests}/${username}`));
            if (existing.exists()) {
                showToast('Username already requested!', 'error');
                return;
            }

            // SAVE TO YOUR DATABASE
            await set(ref(db, `${PATHS.pendingRequests}/${username}`), {
                email, username, password, 
                fullName: fullName || 'N/A',
                employeeId: employeeId || 'N/A',
                requestedAt: new Date().toISOString(),
                status: 'pending'
            });
            
            showToast(`✅ SAVED TO DATABASE! Check Firebase: secretary/pendingRequests/${username}`, 'success');
            signupForm.reset();
            
        } catch (error) {
            showToast('❌ Save failed: ' + error.message, 'error');
        } finally {
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
        
        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        try {
            const userSnap = await get(ref(db, `${PATHS.users}/${username}`));
            const pendingSnap = await get(ref(db, `${PATHS.pendingRequests}/${username}`));
            
            if (pendingSnap.exists()) {
                showToast('⏳ Account pending admin approval', 'error');
                return;
            }
            
            if (userSnap.exists()) {
                const user = userSnap.val();
                if (user.password === password && user.approved) {
                    sessionStorage.setItem('currentUser', username);
                    showToast(`✅ Welcome ${user.fullName || username}!`);
                    
                    setTimeout(() => {
                        if (user.role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'scanner.html';
                        }
                    }, 1000);
                } else {
                    showToast('❌ Wrong password or not approved', 'error');
                }
            } else {
                showToast('❌ User not found', 'error');
            }
        } catch (error) {
            showToast('❌ Login error: ' + error.message, 'error');
        } finally {
            setLoading('loginBtn', false);
        }
    });
}

// Scanner code stays same...
let html5QrCode, isProcessing = false, scanCount = 0;
let currentUser = sessionStorage.getItem('currentUser');

function startScanner() {
    if (!document.getElementById('qr-reader') || !currentUser) return;
    
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;
            
            try {
                const [lrn, name, grade] = decodedText.split('|');
                await push(ref(db, `${PATHS.attendance}`), {
                    lrn, name, grade,
                    scannedAt: new Date().toISOString(),
                    scannedBy: currentUser
                });
                showToast(`✅ ${name} logged!`);
            } catch(e) {
                showToast('❌ Invalid QR', 'error');
            } finally {
                setTimeout(() => isProcessing = false, 2000);
            }
        }
    );
}

// Utilities
window.togglePassword = (id, btn) => {
    const input = document.getElementById(id);
    const icon = btn.querySelector('i');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
};

window.emergencyLogout = () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('qr-reader')) startScanner();
});
