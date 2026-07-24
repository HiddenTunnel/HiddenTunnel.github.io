/*========================================
    UNDERGROUND CHAT - OPTIMIZED CORE ENGINE
========================================*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Global DOM Caching
const DOM = {
  header: document.querySelector("header"),
  glow: document.getElementById('mouse-glow'),
  graffitiBg: document.getElementById('graffiti-bg'),
  interactiveCard: document.getElementById('interactiveCard'),
  hero: document.querySelector(".hero"),
  profilePics: document.querySelectorAll(".profile-pic"),
  logoutBtns: document.querySelectorAll(".logout-btn"),
  overlay: document.getElementById('loginOverlay'),
  loginForm: document.getElementById('loginForm'),
  loginClose: document.getElementById('loginClose'),
  exploreBtn: document.getElementById('exploreBtn'),
  usernameInput: document.getElementById('username'),
  emailInput: document.getElementById('email'),
  passwordInput: document.getElementById('password'),
  authToggle: document.getElementById('authToggle'),
  canvas: document.getElementById('particles-canvas')
};

// State Variables
let isRegisterMode = false;
let mouseX = 0, mouseY = 0;
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let isTabActive = true;
let ticking = false;

/*========================================
        AUTHENTICATION & PROFILE SYNC
========================================*/

function setProfilePhoto(photoUrl) {
  if (!photoUrl) return;
  DOM.profilePics.forEach(img => {
    img.src = photoUrl;
  });
}

// Optimized Logout Handler
async function handleLogout() {
  try {
    await signOut(auth);
    localStorage.removeItem('ug_current_user_id');
    localStorage.removeItem('ug_username');
    localStorage.removeItem('ug_versity_id');
    localStorage.removeItem('ug_user_photo');
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout Error:", err);
  }
}

DOM.logoutBtns.forEach(btn => btn.addEventListener("click", handleLogout));

// Auth Guard & Dynamic Data Retrieval
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!localStorage.getItem('ug_current_user_id')) {
      showLogin();
    } else {
      window.location.href = "login.html";
    }
    return;
  }

  localStorage.setItem('ug_current_user_id', user.uid);

  // Check cached photo first to prevent unnecessary Firestore reads
  const cachedPhoto = localStorage.getItem('ug_user_photo');
  if (cachedPhoto) {
    setProfilePhoto(cachedPhoto);
  }

  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const username = data.fullName || user.email.split('@')[0];
      const versityId = data.versityId || '0000';
      
      localStorage.setItem('ug_username', username);
      localStorage.setItem('ug_versity_id', versityId);

      if (data.photo && data.photo.trim() !== "") {
        localStorage.setItem('ug_user_photo', data.photo);
        setProfilePhoto(data.photo);
      }
    }
  } catch (e) {
    console.error("Error fetching user profile:", e);
  }
});

/*========================================
        MODAL & AUTH CONTROLS
========================================*/

function showLogin() {
  if (!DOM.overlay) return;
  DOM.overlay.classList.add('visible');
  DOM.overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => DOM.usernameInput?.focus(), 150);
}

function hideLogin() {
  if (!DOM.overlay) return;
  DOM.overlay.classList.remove('visible');
  DOM.overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

DOM.loginClose?.addEventListener('click', hideLogin);
DOM.exploreBtn?.addEventListener('click', hideLogin);

document.querySelectorAll('.login, .join, .hero .primary-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const uid = localStorage.getItem('ug_current_user_id');
    if (!uid) {
      e.preventDefault();
      showLogin();
    }
  });
});

if (DOM.authToggle) {
  DOM.authToggle.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    const submitBtn = DOM.loginForm ? DOM.loginForm.querySelector('button[type="submit"]') : null;
    
    if (submitBtn) {
      submitBtn.textContent = isRegisterMode ? "REGISTER TAG" : "ENTER TUNNEL";
    }
    DOM.authToggle.textContent = isRegisterMode 
      ? "Already have a signal? Log In" 
      : "Need a new tag? Register";
  });
}

DOM.loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = DOM.emailInput ? DOM.emailInput.value.trim() : "";
  const password = DOM.passwordInput ? DOM.passwordInput.value.trim() : "";
  const username = DOM.usernameInput ? DOM.usernameInput.value.trim() : "Anonymous Tagger";

  if (!email || !password) {
    alert("Please enter both email and key passcode.");
    return;
  }

  try {
    if (isRegisterMode) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const tagId = Math.floor(1000 + Math.random() * 9000).toString();
      
      await setDoc(doc(db, "users", user.uid), {
        fullName: username,
        email: email,
        versityId: tagId,
        createdAt: serverTimestamp(),
        photo: ""
      });

      localStorage.setItem('ug_current_user_id', user.uid);
      localStorage.setItem('ug_username', username);
      localStorage.setItem('ug_versity_id', tagId);
    } else {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('ug_current_user_id', userCredential.user.uid);
    }
    hideLogin();
  } catch (error) {
    console.error("Authentication Error:", error.message);
    alert("Signal transmission failed: " + error.message);
  }
});

/*========================================
        SCROLL & PARALLAX PERFORMANCE
========================================*/

window.addEventListener("scroll", () => {
  if (!DOM.header) return;
  if (window.scrollY > 40) {
    DOM.header.style.background = "rgba(5,5,5,.85)";
    DOM.header.style.borderBottom = "1px solid rgba(255,255,255,.08)";
  } else {
    DOM.header.style.background = "rgba(5,5,5,.35)";
    DOM.header.style.borderBottom = "1px solid rgba(255,255,255,.04)";
  }
}, { passive: true });

function updateParallax() {
  if (DOM.glow) {
    DOM.glow.style.transform = `translate3d(${mouseX - 225}px, ${mouseY - 225}px, 0)`;
  }

  const moveX = (mouseX / windowWidth - 0.5) * -25;
  const moveY = (mouseY / windowHeight - 0.5) * -25;

  if (DOM.graffitiBg) {
    DOM.graffitiBg.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.02)`;
  }

  if (DOM.interactiveCard) {
    const rect = DOM.interactiveCard.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const cardX = (mouseX - cardCenterX) / 20;
    const cardY = (mouseY - cardCenterY) / 20;

    if (
      mouseX >= rect.left - 50 && mouseX <= rect.right + 50 &&
      mouseY >= rect.top - 50 && mouseY <= rect.bottom + 50
    ) {
      DOM.interactiveCard.style.transform = `translate3d(${cardX}px, ${cardY - 8}px, 0) scale(1.02)`;
    } else {
      DOM.interactiveCard.style.transform = `translate3d(0, 0, 0) scale(1)`;
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

/*========================================
        CANVAS PARTICLES OPTIMIZATION
========================================*/

if (DOM.canvas) {
  const ctx = DOM.canvas.getContext('2d');
  let particles = [];
  const isMobile = windowWidth <= 768;
  const particleCount = isMobile ? 20 : 45; // Reduced particle overhead on mobile

  function resizeCanvas() {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    DOM.canvas.width = windowWidth;
    DOM.canvas.height = windowHeight;
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * DOM.canvas.width;
      this.y = Math.random() * DOM.canvas.height;
      this.size = Math.random() * 2 + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5 - 0.2;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.color = Math.random() > 0.5 ? '#5CFF72' : '#FF7A00';
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > DOM.canvas.width || this.y < 0 || this.y > DOM.canvas.height) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  function animateParticles() {
    if (!isTabActive) return;
    ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animateParticles);
  }

  // Page Visibility API - Freeze particle loop when inactive to save battery/CPU
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isTabActive = false;
    } else {
      isTabActive = true;
      animateParticles();
    }
  });

  animateParticles();
}

/*========================================
        INTERSECTION OBSERVER (REVEALS)
========================================*/

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translate3d(0, 0, 0)";
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".feature-card, .wall-section, .community, .cta, .stats div").forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translate3d(0, 60px, 0)";
  el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
  revealObserver.observe(el);
});

// Initialization Flag
window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});
