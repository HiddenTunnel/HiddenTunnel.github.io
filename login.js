import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
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


// Buttons / inputs
const googleLoginBtn = document.getElementById("googleLoginBtn");
const btnText = document.getElementById("btnText");

const idLoginForm = document.getElementById("idLoginForm");
const versityIdInput = document.getElementById("versityId");
const passwordInput = document.getElementById("password");

let isProcessing = false;


// -----------------------------------------
// Versity ID → Firebase internal email
// -----------------------------------------

function makeLoginEmail(versityId) {
    return `${versityId}@hiddentunnel.local`;
}


// -----------------------------------------
// Route user
// -----------------------------------------

async function checkAndRouteUser(user) {

    if (isProcessing) return;

    isProcessing = true;

    localStorage.setItem("ug_current_user_id", user.uid);

    try {

        const snap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (snap.exists()) {

            window.location.replace("index.html");

        } else {

            window.location.replace("createaccount.html");

        }

    } catch (err) {

        console.error("User verification error:", err);

        isProcessing = false;

        resetGoogleButton();
    }
}


// -----------------------------------------
// Google button reset
// -----------------------------------------

function resetGoogleButton() {

    googleLoginBtn.disabled = false;

    googleLoginBtn.classList.remove("loading");

    btnText.textContent = "Continue with Google";
}


// -----------------------------------------
// Existing Firebase session
// -----------------------------------------

onAuthStateChanged(auth, (user) => {

    if (user && !isProcessing) {

        googleLoginBtn.disabled = true;

        googleLoginBtn.classList.add("loading");

        btnText.textContent = "Recognizing user...";

        checkAndRouteUser(user);
    }

});


// -----------------------------------------
// VERSITY ID + PASSWORD LOGIN
// -----------------------------------------

idLoginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (isProcessing) return;

    const versityId = versityIdInput.value.trim();
    const password = passwordInput.value;

    // IUBAT ID format
    if (!/^262060\d{2}$/.test(versityId)) {

        alert(
            "Invalid Versity ID!\n\n" +
            "ID must start with 262060 followed by 2 digits."
        );

        return;
    }


    if (password.length < 6) {

        alert("Password must be at least 6 characters.");

        return;
    }


    isProcessing = true;

    const loginButton =
        idLoginForm.querySelector("button");

    loginButton.disabled = true;

    loginButton.textContent = "AUTHENTICATING...";


    try {

        await setPersistence(
            auth,
            browserLocalPersistence
        );


        const loginEmail =
            makeLoginEmail(versityId);


        const result =
            await signInWithEmailAndPassword(
                auth,
                loginEmail,
                password
            );


        localStorage.setItem(
            "ug_current_user_id",
            result.user.uid
        );


        loginButton.textContent =
            "ACCESS GRANTED";


        await checkAndRouteUser(result.user);


    } catch (error) {

        console.error(
            "Versity ID Login Error:",
            error
        );


        isProcessing = false;

        loginButton.disabled = false;

        loginButton.textContent =
            "LOGIN WITH ID";


        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/user-not-found" ||
            error.code === "auth/wrong-password"
        ) {

            alert(
                "Invalid Versity ID or password."
            );

        } else {

            alert(
                "Login failed: " +
                error.message
            );
        }
    }

});


// -----------------------------------------
// GOOGLE LOGIN
// -----------------------------------------

googleLoginBtn.addEventListener(
    "click",
    async () => {

        if (isProcessing) return;


        googleLoginBtn.disabled = true;

        googleLoginBtn.classList.add("loading");

        btnText.textContent = "Connecting...";


        try {

            await setPersistence(
                auth,
                browserLocalPersistence
            );


            const result =
                await signInWithPopup(
                    auth,
                    provider
                );


            btnText.textContent =
                "Accessing terminal...";


            await checkAndRouteUser(
                result.user
            );


        } catch (error) {

            console.error(
                "Popup Login Failed:",
                error
            );


            resetGoogleButton();


            if (
                error.code !==
                "auth/popup-closed-by-user"
            ) {

                alert(
                    "Authentication failed: " +
                    error.message
                );
            }
        }

    }
);