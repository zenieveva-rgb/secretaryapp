import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. GLOBAL STATE ---
const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 
let isProcessing = false;
let html5QrCode = null;

// --- 3. SCANNER LOGIC ---
// --- SCANNER LOGIC ---
function startScanner() {
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

            // Now we extract all three parts:
            let lrn = parts[0] ? parts[0].trim() : "N/A";
            let fullName = parts[1] ? parts[1].trim() : null;
            let gradeSection = parts[2] ? parts[2].trim() : "N/A";

            // If the name exists, process the log
            if (fullName && fullName !== "") {
                isProcessing = true; 

                const now = new Date();
                const timeString = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Push to Firebase
                // Use 'push' for Firebase V9
                push(ref(db, 'attendance'), {
                    lrn: lrn,
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
    });
}

// --- 4. THE FIX: ERASER (History Only) ---
const eraserBtn = document.getElementById('toggleDeleteMode');
eraserBtn?.addEventListener('click', async () => {
    if (!document.getElementById('historyTable')) return; // Exit if not on History page

    if (isSelectionMode && selectedAlbums.size > 0) {
        if (prompt(`Move ${selectedAlbums.size} items to Junk? Password:`) === ADMIN_PASSWORD) {
            const deletePromises = [];
            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;

                deletePromises.push(set(ref(db, `trash/${trashId}`), {
                    studentName: name,
                    deletedAt: new Date().toLocaleString(),
                    logs: logsEntries.map(([key, val]) => ({ key, ...val }))
                }));

                logsEntries.forEach(([key]) => deletePromises.push(remove(ref(db, `attendance/${key}`))));
            }
            await Promise.all(deletePromises);
            alert("Success: Moved to Junk.");
            selectedAlbums.clear();
            isSelectionMode = false;
            processData(); 
        }
    } else {
        isSelectionMode = !isSelectionMode;
        eraserBtn.classList.toggle('active', isSelectionMode);
        processData();
    }
});

// --- 5. DATA RENDERING (FIXED: PORTAL vs HISTORY) ---
function processData(searchTerm = "") {
    const attRef = ref(db, 'attendance');
    const portalTable = document.getElementById('attendanceTable'); // FOR PARENT PORTAL
    const historyTable = document.getElementById('historyTable');   // FOR HISTORY PAGE
    
    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        
        // VIEW: PARENT PORTAL (Shows only Text Rows)
        if (portalTable) {
            portalTable.innerHTML = '';
            if (!data) return;
            Object.entries(data)
                .filter(([k, v]) => v.studentName?.toLowerCase().includes(searchTerm))
                .reverse()
                .forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <span>${val.studentName}</span>
                        <span class="text-center">${val.grade || 'N/A'}</span>
                        <span class="text-right">${val.scannedAt || 'No Time'}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        // VIEW: HISTORY (Shows Albums/Folders)
        if (historyTable) {
            historyTable.innerHTML = '';
            if (!data) return;
            const albums = {};
            Object.entries(data).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown";
                if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
                albums[sName].logs.push({ key, ...val });
            });

            Object.keys(albums).filter(n => n.toLowerCase().includes(searchTerm)).forEach(name => {
                const wrapper = document.createElement('div');
                wrapper.className = 'album-row-wrapper';
                wrapper.innerHTML = `
                    ${isSelectionMode ? `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')">` : ''}
                    <div class="student-album">
                        <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                        <div class="album-name">${name}</div>
                        <div class="album-sub">${albums[name].grade}</div>
                        <div class="total-scans">${albums[name].logs.length} Total</div>
                    </div>
                `;
                historyTable.appendChild(wrapper);
            });
        }
    });
}

window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) selectedAlbums.delete(studentName);
    else selectedAlbums.add(studentName);
};

processData();
