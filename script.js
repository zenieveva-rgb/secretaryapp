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
const db  = getDatabase(app);

const PATHS = {
  pendingRequests: 'pendingRequests',
  users:           'users',
  attendance:      'attendance'
};

// ── TOAST ── builds its own element, works on every page
function showToast(message, type = 'success') {
    const existing = document.getElementById('_toast_inject');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '_toast_inject';
    toast.style.cssText = `
        position:fixed; bottom:30px; left:50%;
        transform:translateX(-50%) translateY(80px);
        padding:14px 22px;
        background:rgba(10,10,15,0.96);
        border:1px solid ${type === 'error' ? '#ff416c' : '#05ffa1'};
        color:white; border-radius:12px;
        display:flex; align-items:center; gap:12px;
        box-shadow:0 20px 40px rgba(0,0,0,0.5);
        z-index:99999; font-size:14px; font-family:sans-serif;
        max-width:90vw; opacity:0;
        transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    `;
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
    icon.style.cssText = `color:${type === 'error' ? '#ff416c' : '#05ffa1'}; font-size:18px; flex-shrink:0;`;
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }));
    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ── LOADING BUTTON ──
function setLoading(btnId, show) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let spinner = btn.querySelector('.spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner';
        btn.appendChild(spinner);
    }
    const span = btn.querySelector('span');
    btn.disabled = show;
    if (span)    span.style.opacity    = show ? '0'     : '1';
    spinner.style.display              = show ? 'block' : 'none';
}

// ════════════════════════════════
//  SIGNUP PAGE
// ════════════════════════════════
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async e => {
        e.preventDefault();
        setLoading('signupBtn', true);
        const formData = {
            email:       document.getElementById('newEmail').value,
            username:    document.getElementById('newUsername').value.toLowerCase(),
            password:    document.getElementById('newPassword').value,
            fullName:    document.getElementById('fullName')?.value    || 'N/A',
            employeeId:  document.getElementById('employeeId')?.value  || 'N/A',
            requestedAt: new Date().toISOString()
        };
        try {
            await set(ref(db, `${PATHS.pendingRequests}/${formData.username}`), formData);
            showToast('Request submitted! Admin will review soon.');
            document.getElementById('signupForm').reset();
            const screen = document.getElementById('successScreen');
            if (screen) screen.style.display = 'flex';
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
        setLoading('signupBtn', false);
    });
}

// ════════════════════════════════
//  LOGIN PAGE
// ════════════════════════════════
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        setLoading('loginBtn', true);

        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value.trim();

        try {
            const snap = await get(ref(db, `${PATHS.users}/${username}`));

            if (!snap.exists()) {
                showToast('User not found. Ask admin to approve your account.', 'error');
                setLoading('loginBtn', false);
                return;
            }

            const user = snap.val();
            console.log('Firebase user data:', user); // DEBUG — remove later

            const passwordOk = user.password === password;
            // approved can be boolean true OR string "true" — accept both
            const approvedOk = user.approved === true || user.approved === 'true';

            if (passwordOk && approvedOk) {
                sessionStorage.setItem('currentUser',     username);
                sessionStorage.setItem('currentUserName', user.fullName || username);
                showToast('Login successful! Opening scanner...');
                setTimeout(() => window.location.href = 'scanner.html', 1200);
            } else if (!passwordOk) {
                showToast('Wrong password.', 'error');
            } else {
                showToast('Account not yet approved by admin.', 'error');
            }

        } catch (err) {
            showToast('Login error: ' + err.message, 'error');
        }

        setLoading('loginBtn', false);
    });
}

// ════════════════════════════════
//  SCANNER PAGE
// ════════════════════════════════
if (document.getElementById('qr-reader')) {

    const securityCheck   = document.getElementById('security-check');
    const unauthorizedDiv = document.getElementById('unauthorized-overlay');
    const currentUser     = sessionStorage.getItem('currentUser');
    const currentUserName = sessionStorage.getItem('currentUserName') || currentUser;

    // ── No session → block + redirect ──
    if (!currentUser) {
        if (securityCheck)   securityCheck.style.display   = 'none';
        if (unauthorizedDiv) unauthorizedDiv.style.display = 'flex';
        setTimeout(() => window.location.href = 'index.html', 2000);

    } else {
        // ── Has session → show UI + start camera ──

        // Hide loading overlay immediately
        if (securityCheck) securityCheck.style.display = 'none';

        // Show user info
        const userInfoCard = document.getElementById('user-info-card');
        const userNameEl   = document.getElementById('current-user-name');
        if (userInfoCard) userInfoCard.style.display = 'flex';
        if (userNameEl)   userNameEl.textContent     = currentUserName;

        // Session timer (counts up)
        let seconds = 0;
        const timerEl = document.getElementById('session-timer');
        setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `Session: ${m}:${s}`;
        }, 1000);

        // Countdown (30 min auto-logout)
        let countdown = 30 * 60;
        const countdownEl = document.getElementById('countdown');
        const cdInterval  = setInterval(() => {
            countdown--;
            const m = String(Math.floor(countdown / 60)).padStart(2, '0');
            const s = String(countdown % 60).padStart(2, '0');
            if (countdownEl) countdownEl.textContent = `${m}:${s}`;
            if (countdown <= 0) {
                clearInterval(cdInterval);
                showToast('Session expired. Logging out...', 'error');
                setTimeout(() => window.emergencyLogout(), 2000);
            }
        }, 1000);

        // Stats
        let scanCount    = 0;
        let sessionScans = 0;

        // Activity log
        function addToLog(name, grade, success = true) {
            const list = document.getElementById('scan-list');
            if (!list) return;
            const item = document.createElement('div');
            item.className = 'scan-item';
            item.innerHTML = `
                <div class="scan-icon" style="background:${success ? 'rgba(5,255,161,0.1)' : 'rgba(255,65,108,0.1)'}">
                    <i class="fas fa-${success ? 'check' : 'times'}"
                       style="color:${success ? 'var(--success,#05ffa1)' : '#ff416c'}"></i>
                </div>
                <div class="scan-info">
                    <div class="scan-name">${name}</div>
                    <div class="scan-time">${grade} · ${new Date().toLocaleTimeString()}</div>
                </div>`;
            list.prepend(item);
        }

        // ── START SCANNER ──
        window.startScanner = function () {
            const html5QrCode = new Html5Qrcode('qr-reader');

            html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },

                // SUCCESS CALLBACK
                async (text) => {
                    const parts = text.split('|');
                    if (parts.length < 3) {
                        showToast('Invalid QR. Format must be: LRN|Name|Grade', 'error');
                        return;
                    }
                    const [lrn, name, grade] = parts;
                    try {
                        await push(ref(db, PATHS.attendance), {
                            lrn, name, grade,
                            scannedBy: currentUser,
                            time: new Date().toISOString()
                        });
                        scanCount++;
                        sessionScans++;
                        const el1 = document.getElementById('scan-count');
                        const el2 = document.getElementById('session-scans');
                        const el3 = document.getElementById('last-scan');
                        if (el1) el1.textContent = scanCount;
                        if (el2) el2.textContent = sessionScans;
                        if (el3) el3.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        addToLog(name, grade, true);
                        showToast(`${name} — attendance logged!`);

                        const statusEl = document.getElementById('scanner-status');
                        if (statusEl) {
                            statusEl.innerHTML    = '<span class="status-dot"></span> Scan Successful';
                            statusEl.style.borderColor = 'rgba(5,255,161,0.5)';
                            setTimeout(() => {
                                statusEl.innerHTML         = '<span class="status-dot"></span> Ready';
                                statusEl.style.borderColor = '';
                            }, 2000);
                        }
                    } catch (err) {
                        showToast('Save failed: ' + err.message, 'error');
                        addToLog(name, grade, false);
                    }
                },

                // ERROR CALLBACK (QR not detected yet — ignore)
                () => {}

            ).then(() => {
                // Camera is running
                const statusEl      = document.getElementById('scanner-status');
                const cameraWarning = document.getElementById('camera-warning');
                if (statusEl)      statusEl.innerHTML          = '<span class="status-dot"></span> Ready';
                if (cameraWarning) cameraWarning.style.display = 'none';

            }).catch((err) => {
                // Camera failed to start
                const cameraWarning = document.getElementById('camera-warning');
                const statusEl      = document.getElementById('scanner-status');
                if (cameraWarning) cameraWarning.style.display = 'flex';
                if (statusEl)      statusEl.innerHTML          = '<span class="status-dot"></span> Camera Error';
                console.error('Camera start error:', err);
                showToast('Camera error: ' + err, 'error');
            });

            // Pause / Resume
            let paused = false;
            window.pauseScanner = function () {
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

        // Logout
        window.emergencyLogout = function () {
            sessionStorage.clear();
            window.location.href = 'index.html';
        };

        // Auto-start camera
        startScanner();
    }
}

// Toggle password visibility
window.togglePassword = (id, btn) => {
    const input = document.getElementById(id);
    input.type  = input.type === 'password' ? 'text' : 'password';
    btn.querySelector('i').className = input.type === 'password'
        ? 'fas fa-eye'
        : 'fas fa-eye-slash';
};
