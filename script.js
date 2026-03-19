import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBU4Mvwjuv2HOscvYyQT4UwHNsyoXIr6Kw",
  authDomain: "school-secretary-app.firebaseapp.com",
  databaseURL: "https://school-secretary-app-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "school-secretary-app",
  storageBucket: "school-secretary-app.firebasestorage.app",
  messagingSenderId: "507429367336",
  appId: "1:507429367336:web:796e381a780a33ef98cf1d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const PATHS = {
  pendingRequests: 'pendingRequests',
  users: 'users',
  attendance: 'attendance'
};

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.style.cssText = `
            position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:16px 24px;
            background:rgba(10,10,15,0.95);border:1px solid #05ffa1;color:white;border-radius:12px;
            display:flex;align-items:center;gap:12px;box-shadow:0 20px 40px rgba(0,0,0,0.4);
            z-index:10000;font-size:14px;max-width:90vw;
        `;
        toast.innerHTML = '<i class="fas fa-check" style="font-size:20px;color:#05ffa1;"></i><span id="toast-msg"></span>';
        document.body.appendChild(toast);
    }
    const msg = document.getElementById('toast-msg') || toast.querySelector('span');
    const icon = toast.querySelector('i');
    msg.textContent = message;
    if (type === 'error') {
        toast.style.borderColor = '#ff416c';
        icon.style.color = '#ff416c';
        icon.className = 'fas fa-exclamation-triangle';
    } else {
        toast.style.borderColor = '#05ffa1';
        icon.style.color = '#05ffa1';
        icon.className = 'fas fa-check';
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// BUG 3 FIXED — insertAdjacentHTML returns undefined, so spinner was never stored.
// Now we check for existing spinner first, then create it properly if missing.
function setLoading(btnId, show) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let spinner = btn.querySelector('.spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner';
        btn.appendChild(spinner);
    }
    const textSpan = btn.querySelector('span');
    if (show) {
        btn.disabled = true;
        if (textSpan) textSpan.style.opacity = '0';
        spinner.style.display = 'block';
    } else {
        btn.disabled = false;
        if (textSpan) textSpan.style.opacity = '1';
        spinner.style.display = 'none';
    }
}

// SIGNUP
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async e => {
        e.preventDefault();
        setLoading('signupBtn', true);

        const formData = {
            email: document.getElementById('newEmail').value,
            username: document.getElementById('newUsername').value.toLowerCase(),
            password: document.getElementById('newPassword').value,
            fullName: document.getElementById('fullName')?.value || 'N/A',
            employeeId: document.getElementById('employeeId')?.value || 'N/A',
            requestedAt: new Date().toISOString()
        };

        try {
            await set(ref(db, `${PATHS.pendingRequests}/${formData.username}`), formData);
            showToast('Request submitted! Admin will review soon.');
            document.getElementById('signupForm').reset();

            // BUG 4 FIXED — show the success screen after a successful write
            const successScreen = document.getElementById('successScreen');
            if (successScreen) successScreen.style.display = 'flex';

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
        setLoading('signupBtn', false);
    });
}

// LOGIN
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        setLoading('loginBtn', true);

        const username = document.getElementById('username').value.toLowerCase();
        const password = document.getElementById('password').value;

        try {
            const userSnap = await get(ref(db, `${PATHS.users}/${username}`));
            if (userSnap.exists()) {
                const user = userSnap.val();
                if (user.password === password && user.approved) {
                    sessionStorage.setItem('currentUser', username);
                    showToast('Login successful!');
                    setTimeout(() => window.location.href = 'scanner.html', 1000);
                } else {
                    showToast('Invalid credentials or account not approved.', 'error');
                }
            } else {
                showToast('User not found.', 'error');
            }
        } catch (err) {
            showToast('Login failed: ' + err.message, 'error');
        }
        setLoading('loginBtn', false);
    });
}

// SCANNER
if (document.getElementById('qr-reader')) {
    const currentUser = sessionStorage.getItem('currentUser');

    // BUG 5 FIXED — redirect to login if no session instead of silently doing nothing
    if (!currentUser) {
        window.location.href = 'index.html';
    } else {
        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async text => {
                try {
                    const [lrn, name, grade] = text.split('|');
                    await push(ref(db, `${PATHS.attendance}`), {
                        lrn, name, grade, scannedBy: currentUser, time: new Date().toISOString()
                    });
                    showToast(`${name} logged!`);
                } catch (err) {
                    showToast('Invalid QR code.', 'error');
                }
            }
        );
    }
}

window.togglePassword = (id, btn) => {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.querySelector('i').className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
};
