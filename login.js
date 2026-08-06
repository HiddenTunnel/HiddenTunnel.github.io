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
const btnText = document.getElementById("btnText");
let isProcessing = false;

// Fast User Routing Guard
async function checkAndRouteUser(user) {
    if (isProcessing) return;
    isProcessing = true;

    localStorage.setItem("ug_current_user_id", user.uid);

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            window.location.replace("index.html");
        } else {
            window.location.replace("createaccount.html");
        }
    } catch (err) {
        console.error("User verification error:", err);
        isProcessing = false;
        resetButton();
    }
}

function resetButton() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.classList.remove("loading");
    btnText.textContent = "Continue with Google";
}

// 1. Instant check for returning session
onAuthStateChanged(auth, (user) => {
    if (user && !isProcessing) {
        googleLoginBtn.disabled = true;
        googleLoginBtn.classList.add("loading");
        btnText.textContent = "Recognizing user...";
        checkAndRouteUser(user);
    }
});

// 2. High-speed Popup Login
googleLoginBtn.addEventListener("click", async () => {
    if (isProcessing) return;

    googleLoginBtn.disabled = true;
    googleLoginBtn.classList.add("loading");
    btnText.textContent = "Connecting...";

    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, provider);
        
        btnText.textContent = "Accessing terminal...";
        await checkAndRouteUser(result.user);

    } catch (error) {
        console.error("Popup Login Failed:", error);
        resetButton();
        if (error.code !== "auth/popup-closed-by-user") {
            alert("Authentication failed: " + error.message);
        }
    }
});
