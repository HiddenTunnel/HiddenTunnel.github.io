import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyARFZiBsFAtgKAtWtMnyka52PORQFolijI",
    authDomain: "urbannoir-13ce8.firebaseapp.com",
    projectId: "urbannoir-13ce8",
    storageBucket: "urbannoir-13ce8.firebasestorage.app",
    messagingSenderId: "1059246827383",
    appId: "1:1059246827383:web:caa91c40c408d46e3b6372",
    measurementId: "G-CEPWKZXQVF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const googleLoginBtn = document.getElementById("googleLoginBtn");
let isRouting = false;

// Fast router: Checks Firestore & redirects in one place
async function routeUser(user) {
    if (isRouting) return;
    isRouting = true;

    localStorage.setItem("ug_current_user_id", user.uid);

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            window.location.replace("index.html");
        } else {
            window.location.replace("createaccount.html");
        }
    } catch (err) {
        console.error("Routing error:", err);
        isRouting = false;
        resetButtonUI();
    }
}

function resetButtonUI() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.style.opacity = "1";
    googleLoginBtn.style.cursor = "pointer";
    googleLoginBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continue with Google
    `;
}

// 1. AUTO-LOGIN: For returning users already logged in
onAuthStateChanged(auth, (user) => {
    if (user && !isRouting) {
        googleLoginBtn.disabled = true;
        googleLoginBtn.style.opacity = "0.7";
        googleLoginBtn.textContent = "Recognizing user...";
        routeUser(user);
    }
});

// 2. FAST LOGIN: Instant popup login on button click
googleLoginBtn.addEventListener("click", async () => {
    if (isRouting) return;

    googleLoginBtn.disabled = true;
    googleLoginBtn.style.opacity = "0.6";
    googleLoginBtn.style.cursor = "not-allowed";
    googleLoginBtn.textContent = "Connecting...";

    try {
        await setPersistence(auth, browserLocalPersistence);
        
        // Triggers the fast popup auth flow
        const result = await signInWithPopup(auth, provider);
        
        googleLoginBtn.textContent = "Verifying terminal access...";
        await routeUser(result.user);

    } catch (error) {
        console.error("Fast Login Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("Authentication failed: " + error.message);
        }
        resetButtonUI();
    }
});
