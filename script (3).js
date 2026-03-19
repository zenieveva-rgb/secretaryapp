// ── FIREBASE CONFIG (your school-secretary-app database) ──
const firebaseConfig = {
    apiKey: "AIzaSyBU4Mvwjuv2HOscvYyQT4UwHNsyoXIr6Kw",
    authDomain: "school-secretary-app.firebaseapp.com",
    databaseURL: "https://school-secretary-app-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "school-secretary-app",
    storageBucket: "school-secretary-app.firebasestorage.app",
    messagingSenderId: "507429367336",
    appId: "1:507429367336:web:796e381a780a33ef98cf1d"
};

// Initialize Firebase (compat version — no import needed)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ── TOAST ──
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
        border:1px solid ${type === 'error' ? '#ff416c' : '#00ffcc'};
        color:white; border-radius:12px;
        display:flex; align-items:center; gap:12px;
        box-shadow:0 20px 40px rgba(0,0,0,0.5);
        z-index:99999; font-size:14px; font-family:sans-serif;
        max-width:90vw; opacity:0;
        transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    `;
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
    icon.style.cssText = `color:${type === 'error' ? '#ff416c' : '#00ffcc'}; font-size:18px; flex-shrink:0;`;
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

// ════════════════════════════════
//  SIGNUP PAGE (signup.html)
// ════════════════════════════════
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('newEmail').value.trim();
        const username = document.getElementById('newUsername').value.trim().toLowerCase();
        const password = document.getElementById('newPassword').value.trim();

        if (!email || !username || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        try {
            // Save to pendingRequests — admin approves manually
            await database.ref('pendingRequests/' + username).set({
                email,
                username,
                password,
                requestedAt: new Date().toISOString()
            });
            showToast('Account request sent! Wait for admin approval.');
            signupForm.reset();
            setTimeout(() => window.location.href = 'index.html', 2000);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

// ════════════════════════════════
//  LOGIN PAGE (index.html)
// ════════════════════════════════
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value.trim();

        try {
            const snap = await database.ref('users/' + username).get();

            if (!snap.exists()) {
                showToast('User not found. Please sign up first.', 'error');
                return;
            }

            const user = snap.val();
            console.log('User from Firebase:', user); // debug

            // Check password
            if (user.password !== password) {
                showToast('Wrong password.', 'error');
                return;
            }

            // Check approved — accepts boolean true or string "true"
            if (user.approved !== true && user.approved !== 'true') {
                showToast('Account not approved yet. Contact admin.', 'error');
                return;
            }

            // All good — save session and go to scanner
            sessionStorage.setItem('currentUser', username);
            showToast('Login successful! Opening scanner...');
            setTimeout(() => window.location.href = 'scanner.html', 1200);

        } catch (err) {
            showToast('Login error: ' + err.message, 'error');
        }
    });
}

// ════════════════════════════════
//  SCANNER PAGE (scanner.html)
// ════════════════════════════════
const qrReader = document.getElementById('qr-reader');
if (qrReader) {

    const currentUser = sessionStorage.getItem('currentUser');

    // No session → send back to login
    if (!currentUser) {
        showToast('Please log in first.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);

    } else {
        // Show who is logged in
        const userLabel = document.getElementById('logged-in-user');
        if (userLabel) userLabel.textContent = 'Logged in as: ' + currentUser;

        // Start scanner
        const html5QrCode = new Html5Qrcode('qr-reader');

        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 20, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },

            // ── SCAN SUCCESS ──
            (decodedText) => {
                // QR format: LRN|Name|Grade  OR  LRN,Name,Grade
                const sep   = decodedText.includes('|') ? '|' : ',';
                const parts = decodedText.split(sep);

                if (parts.length < 2) {
                    showToast('QR format not recognized.', 'error');
                    return;
                }

                const lrn         = parts[0]?.trim() || 'N/A';
                const studentName = parts[1]?.trim() || 'Unknown';
                const grade       = parts[2]?.trim() || 'N/A';

                const now        = new Date();
                const timeString = now.toLocaleDateString() + ' | ' +
                                   now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Push to Firebase attendance
                database.ref('attendance').push({
                    lrn,
                    studentName,
                    grade,
                    scannedBy: currentUser,
                    scannedAt: timeString,
                    timestamp: now.toISOString()
                }).then(() => {
                    showToast('Scanned: ' + studentName);

                    const status = document.getElementById('scan-status');
                    const info   = document.getElementById('last-scan-info');
                    if (status) status.textContent = 'SCAN SUCCESSFUL';
                    if (info)   info.textContent   = studentName + ' · ' + grade + ' · ' + timeString;

                    // Reset status after 2s
                    setTimeout(() => {
                        if (status) status.textContent = 'READY TO SCAN';
                    }, 2000);

                }).catch(err => {
                    showToast('Save failed: ' + err.message, 'error');
                });
            },

            // ── SCAN ERROR (not a QR yet — ignore) ──
            () => {}

        ).catch(err => {
            showToast('Camera error: ' + err, 'error');
            console.error('Scanner start error:', err);
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        }
    }
}
