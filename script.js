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

// ── TOAST ──
// Creates its own toast element from scratch — works on ALL pages, no ID dependency
function showToast(message, type = 'success') {
    const existing = document.getElementById('_toast_inject');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '_toast_inject';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        padding: 14px 22px;
        background: rgba(10,10,15,0.96);
        border: 1px solid ${type === 'error' ? '#ff416c' : '#05ffa1'};
        color: white;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        z-index: 99999;
        font-size: 14px;
        font-family: sans-serif;
        max-width: 90vw;
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    `;

    const iconEl = document.createElement('i');
    iconEl.className = type === 'error'
        ? 'fas fa-exclamation-triangle'
        : 'fas fa-check-circle';
    iconEl.style.cssText = `color: ${type === 'error' ? '#ff416c' : '#05ffa1'}; font-size: 18px; flex-shrink: 0;`;

    const textEl = document.createElement('span');
    textEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(textEl);
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ── LOADING ──
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

// ── SIGNUP ──
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
            const successScreen = document.getElementById('successScreen');
            if (successScreen) successScreen.style.display = 'flex';
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
        setLoading('signupBtn', false);
    });
}

// ── LOGIN ──
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
                if (user.password === password && user.approved === true) {
                    sessionStorage.setItem('currentUser', username);
                    sessionStorage.setItem('currentUserName', user.fullName || username);
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

// ── SCANNER ──
if (document.getElementById('qr-reader')) {

    const securityCheck   = document.getElementById('security-check');
    const unauthorizedDiv = document.getElementById('unauthorized-overlay');
    const currentUser     = sessionStorage.getItem('currentUser');
    const currentUserName = sessionStorage.getItem('currentUserName') || currentUser;

    if (!currentUser) {
        if (securityCheck)   securityCheck.style.display   = 'none';
        if (unauthorizedDiv) unauthorizedDiv.style.display = 'flex';
        setTimeout(() => window.location.href = 'index.html', 2000);

    } else {
        const userInfoCard = document.getElementById('user-info-card');
        const userNameEl   = document.getElementById('current-user-name');
        if (userInfoCard) userInfoCard.style.display = 'flex';
        if (userNameEl)   userNameEl.textContent = currentUserName;

        // Session timer
        let seconds = 0;
        const timerEl = document.getElementById('session-timer');
        setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `Session: ${m}:${s}`;
        }, 1000);

        // Countdown 30 min
        let countdown = 30 * 60;
        const countdownEl = document.getElementById('countdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            const m = String(Math.floor(countdown / 60)).padStart(2, '0');
            const s = String(countdown % 60).padStart(2, '0');
            if (countdownEl) countdownEl.textContent = `${m}:${s}`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                showToast('Session expired. Logging out...', 'error');
                setTimeout(() => emergencyLogout(), 2000);
            }
        }, 1000);

        let scanCount = 0;
        let sessionScans = 0;

        function addToLog(name, grade, success = true) {
            const list = document.getElementById('scan-list');
            if (!list) return;
            const item = document.createElement('div');
            item.className = 'scan-item';
            item.innerHTML = `
                <div class="scan-icon" style="background:${success ? 'rgba(5,255,161,0.1)' : 'rgba(255,65,108,0.1)'}">
                    <i class="fas fa-${success ? 'check' : 'times'}" style="color:${success ? 'var(--success)' : '#ff416c'}"></i>
                </div>
                <div class="scan-info">
                    <div class="scan-name">${name}</div>
                    <div class="scan-time">${grade} · ${new Date().toLocaleTimeString()}</div>
                </div>`;
            list.prepend(item);
        }

        window.startScanner = function() {
            const html5QrCode = new Html5Qrcode("qr-reader");

            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (text) => {
                    try {
                        const parts = text.split('|');
                        if (parts.length < 3) {
                            showToast('Invalid QR format. Use LRN|Name|Grade', 'error');
                            return;
                        }
                        const [lrn, name, grade] = parts;
                        await push(ref(db, PATHS.attendance), {
                            lrn, name, grade,
                            scannedBy: currentUser,
                            time: new Date().toISOString()
                        });
                        scanCount++;
                        sessionScans++;
                        const scanCountEl    = document.getElementById('scan-count');
                        const sessionScansEl = document.getElementById('session-scans');
                        const lastScanEl     = document.getElementById('last-scan');
                        if (scanCountEl)    scanCountEl.textContent    = scanCount;
                        if (sessionScansEl) sessionScansEl.textContent = sessionScans;
                        if (lastScanEl)     lastScanEl.textContent     = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        addToLog(name, grade, true);
                        showToast(`${name} logged successfully!`);

                        const statusEl = document.getElementById('scanner-status');
                        if (statusEl) {
                            statusEl.innerHTML = '<span class="status-dot"></span> Scan Successful';
                            statusEl.style.borderColor = 'rgba(5,255,161,0.5)';
                            setTimeout(() => {
                                statusEl.innerHTML = '<span class="status-dot"></span> Ready';
                                statusEl.style.borderColor = '';
                            }, 2000);
                        }
                    } catch (err) {
                        showToast('Failed to save: ' + err.message, 'error');
                        addToLog('Unknown', 'Error', false);
                    }
                },
                () => { /* ignore decode errors */ }
            ).then(() => {
                if (securityCheck) securityCheck.style.display = 'none';
                const statusEl = document.getElementById('scanner-status');
                if (statusEl) statusEl.innerHTML = '<span class="status-dot"></span> Ready';
                const cameraWarning = document.getElementById('camera-warning');
                if (cameraWarning) cameraWarning.style.display = 'none';
            }).catch((err) => {
                if (securityCheck) securityCheck.style.display = 'none';
                const cameraWarning = document.getElementById('camera-warning');
                if (cameraWarning) cameraWarning.style.display = 'flex';
                const statusEl = document.getElementById('scanner-status');
                if (statusEl) statusEl.innerHTML = '<span class="status-dot"></span> Camera Error';
                console.error('Camera error:', err);
            });

            let paused = false;
            window.pauseScanner = function() {
                const btn = document.getElementById('pause-btn');
                if (!paused) {
                    html5QrCode.pause();
                    paused = true;
                    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Resume';
                } else {
                    html5QrCode.resume();
                    paused = false;
                    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                }
            };
        };

        window.emergencyLogout = function() {
            sessionStorage.clear();
            window.location.href = 'index.html';
        };

        startScanner();
    }
}

window.togglePassword = (id, btn) => {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.querySelector('i').className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
};
