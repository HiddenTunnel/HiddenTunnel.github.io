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
let isLoginLocked = false;

// 1️⃣ PREVIOUS USER RECOGNIZING LOGIC
onAuthStateChanged(auth, async (user) => {
    if (user) {
        googleLoginBtn.textContent = "Recognizing user...";
        googleLoginBtn.style.opacity = "0.7";
        googleLoginBtn.style.cursor = "wait";
        isLoginLocked = true;

        localStorage.setItem("ug_current_user_id", user.uid);
        
        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                window.location.href = "index.html";
            } else {
                window.location.href = "createaccount.html";
            }
        } catch (err) {
            console.error("Auto login check error:", err);
            isLoginLocked = false;
            googleLoginBtn.textContent = "Continue with Google";
            googleLoginBtn.style.opacity = "1";
            googleLoginBtn.style.cursor = "pointer";
        }
    }
});

// 2️⃣ NEW USER FAST LOGIN & 7s COUNTDOWN LOCK
googleLoginBtn.addEventListener("click", async () => {
    if (isLoginLocked) return;

    isLoginLocked = true;
    googleLoginBtn.style.opacity = "0.6";
    googleLoginBtn.style.cursor = "not-allowed";

    let countdown = 7;
    const originalText = googleLoginBtn.textContent;
    
    const lockTimer = setInterval(() => {
        if (countdown > 0) {
            googleLoginBtn.textContent = `Please wait (${countdown}s)...`;
            countdown--;
        } else {
            clearInterval(lockTimer);
            isLoginLocked = false;
            googleLoginBtn.textContent = originalText;
            googleLoginBtn.style.opacity = "1";
            googleLoginBtn.style.cursor = "pointer";
        }
    }, 1000);

    try {
        googleLoginBtn.textContent = "Connecting to tunnel...";
        await setPersistence(auth, browserLocalPersistence);
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        localStorage.setItem("ug_current_user_id", user.uid);

        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
            window.location.href = "index.html";
        } else {
            window.location.href = "createaccount.html";
        }

    } catch (error) {
        console.error("Login Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert(error.message);
        }
        clearInterval(lockTimer);
        isLoginLocked = false;
        googleLoginBtn.textContent = originalText;
        googleLoginBtn.style.opacity = "1";
        googleLoginBtn.style.cursor = "pointer";
    }
});
