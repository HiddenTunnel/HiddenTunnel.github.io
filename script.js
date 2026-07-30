/*========================================
    UNDERGROUND CHAT - INDEX SCRIPT ENGINE
========================================*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const booksContainer = document.getElementById('booksContainer');
const popularBooksContainer = document.getElementById('popularBooks');

/*========================================
    OPTIMIZED INSTANT PROFILE PHOTO SYSTEM
========================================*/

const AVATAR_CACHE_KEY = "ug_user_avatar_cache";

// 1. INSTANT EXECUTION: Load from localStorage cache immediately on script execution
(function loadCachedAvatarImmediately() {
  const cachedPhoto = localStorage.getItem(AVATAR_CACHE_KEY);
  if (cachedPhoto) {
    applyProfilePhotoToDOM(cachedPhoto);
  }
})();

// Helper to update all avatar targets smoothly
function applyProfilePhotoToDOM(photoUrl) {
  if (!photoUrl) return;
  
  const targets = [
    document.getElementById("mobileProfilePic"),
    document.getElementById("desktopProfilePic"),
    document.getElementById("publishAvatar")
  ];
  
  targets.forEach((img) => {
    if (img && img.src !== photoUrl) {
      // Pre-cache image in memory to avoid flashing black/white box
      const preloader = new Image();
      preloader.src = photoUrl;
      preloader.onload = () => {
        img.src = photoUrl;
      };
    }
  });
}

// Update Local Cache + DOM
function setProfilePhoto(photoUrl) {
  if (!photoUrl) return;
  localStorage.setItem(AVATAR_CACHE_KEY, photoUrl);
  applyProfilePhotoToDOM(photoUrl);
}

/*========================================
        AUTH GUARD & DUAL-FETCH
========================================*/

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem(AVATAR_CACHE_KEY);
    window.location.href = "login.html";
    return;
  }
  
  // 2. IMMEDIATE FALLBACK: Use Google account photo right away if available
  if (user.photoURL) {
    setProfilePhoto(user.photoURL);
  }
  
  // 3. ASYNC BACKGROUND SYNC: Sync with custom avatar from Firestore
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
    console.error("Error fetching Firestore photo:", e);
  }
  
  // Load book feeds in parallel after auth check
  loadLatestBooks();
  loadPopularBooks();
});

async function handleLogout() {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout Error:", err);
  }
}

document.getElementById("logoutBtnDesktop")?.addEventListener("click", handleLogout);
document.getElementById("logoutBtnMobile")?.addEventListener("click", handleLogout);

/*========================================
        FIREBASE BOOKS FEED ENGINE
========================================*/

function createBookCardHTML(id, book) {
  const isPaid = book.paid || false;
  const priceTag = isPaid ? `৳${book.price || 0}` : "FREE";
  const badgeClass = isPaid ? "book-badge-paid" : "book-badge-free";
  const coverImg = book.cover || "assets/pic/banner.png";
  const uploader = book.uploader || "Anonymous";
  const downloads = book.downloads || 0;
  
  return `
    <a href="view-post.html?id=${id}" class="book-card">
      <div class="book-cover-wrapper">
        <img src="${coverImg}" alt="${book.title || 'Book Cover'}" class="book-cover" loading="lazy">
        <span class="${badgeClass}">${priceTag}</span>
      </div>
      <div class="book-info">
        <h3 class="book-title">${book.title || 'Untitled Book'}</h3>
        <p class="book-author">By ${uploader}</p>
        <div class="book-stats">
          <span>📥 ${downloads} downloads</span>
          <span>❤️ ${book.likes || 0}</span>
        </div>
      </div>
    </a>
  `;
}

// Fetch Latest Books
async function loadLatestBooks() {
  if (!booksContainer) return;
  
  try {
    const booksQuery = query(
      collection(db, "books"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const querySnapshot = await getDocs(booksQuery);
    
    if (querySnapshot.empty) {
      booksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No books published yet.</p>`;
      return;
    }
    
    let html = "";
    querySnapshot.forEach((docSnap) => {
      html += createBookCardHTML(docSnap.id, docSnap.data());
    });
    booksContainer.innerHTML = html;
    
  } catch (error) {
    console.error("Error loading latest books:", error);
    booksContainer.innerHTML = `<p style="color: var(--red); font-size: 0.9rem;">Failed to load books.</p>`;
  }
}

// Fetch Popular / Trending Books
async function loadPopularBooks() {
  if (!popularBooksContainer) return;
  
  try {
    const popularQuery = query(
      collection(db, "books"),
      orderBy("downloads", "desc"),
      limit(6)
    );
    const querySnapshot = await getDocs(popularQuery);
    
    if (querySnapshot.empty) {
      popularBooksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No trending books right now.</p>`;
      return;
    }
    
    let html = "";
    querySnapshot.forEach((docSnap) => {
      html += createBookCardHTML(docSnap.id, docSnap.data());
    });
    popularBooksContainer.innerHTML = html;
    
  } catch (error) {
    console.error("Error loading popular books:", error);
    popularBooksContainer.innerHTML = `<p style="color: var(--red); font-size: 0.9rem;">Failed to load trending books.</p>`;
  }
}

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