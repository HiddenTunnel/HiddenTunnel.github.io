/*========================================
    UNDERGROUND CHAT - INDEX SCRIPT ENGINE
========================================*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyARFZiBsFAtgKAtWtMnyka52PORQFolijI",
  authDomain: "urbannoir-13ce8.firebaseapp.com",
  projectId: "urbannoir-13ce8",
  storageBucket: "urbannoir-13ce8.firebasestorage.app",
  messagingSenderId: "1059246827383",
  appId: "1:1059246827383:web:caa91c40c408d46e3b6372",
  measurementId: "G-CEPWKZXQVF"
};

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global State Variables
let mouseX = 0,
  mouseY = 0;
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let ticking = false;

// DOM Element References
const glow = document.getElementById('mouse-glow');
const graffitiBg = document.getElementById('graffiti-bg');
const interactiveCard = document.getElementById('interactiveCard');

/*========================================
        PROFILE PHOTO & AUTH GUARD
========================================*/

function setProfilePhoto(photoUrl) {
  if (!photoUrl) return;
  const mPic = document.getElementById("mobileProfilePic");
  const dPic = document.getElementById("desktopProfilePic");
  if (mPic) mPic.src = photoUrl;
  if (dPic) dPic.src = photoUrl;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.photo && data.photo.trim() !== "") {
        setProfilePhoto(data.photo);
      }
    }
  } catch (e) {
    console.error("Error fetching photo for header:", e);
  }
});

async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout Error:", err);
  }
}

document.getElementById("logoutBtnDesktop")?.addEventListener("click", handleLogout);
document.getElementById("logoutBtnMobile")?.addEventListener("click", handleLogout);

/*========================================
        PARALLAX & MOUSE ENGINE
========================================*/

function updateParallax() {
  if (glow) {
    glow.style.transform = `translate3d(${mouseX - 225}px, ${mouseY - 225}px, 0)`;
  }
  
  const moveX = (mouseX / windowWidth - 0.5) * -25;
  const moveY = (mouseY / windowHeight - 0.5) * -25;
  
  if (graffitiBg) {
    graffitiBg.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.02)`;
  }
  
  if (interactiveCard) {
    const rect = interactiveCard.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    
    const cardX = (mouseX - cardCenterX) / 20;
    const cardY = (mouseY - cardCenterY) / 20;
    
    if (
      mouseX >= rect.left - 50 && mouseX <= rect.right + 50 &&
      mouseY >= rect.top - 50 && mouseY <= rect.bottom + 50
    ) {
      interactiveCard.style.transform = `translate3d(${cardX}px, ${cardY - 8}px, 0) scale(1.02)`;
    } else {
      interactiveCard.style.transform = `translate3d(0, 0, 0) scale(1)`;
    }
  }
  
  ticking = false;
}

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
}, { passive: true });

window.addEventListener('resize', () => {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
}, { passive: true });