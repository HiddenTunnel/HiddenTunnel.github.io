/*========================================
    UNDERGROUND CHAT - INDEX SCRIPT ENGINE
========================================*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const API_URL = "https://urbannoir-api.mushfiquemonowarnamir2006.workers.dev";
const DEVELOPER_UID = "YOUR_DEVELOPER_FIREBASE_UID_HERE";

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
const db = getFirestore(app);
const auth = getAuth(app);

let currentFirebaseUser = null;
let allFetchedPosts = [];
let mouseX = 0, mouseY = 0;
let ticking = false;

const glow = document.getElementById('mouse-glow');
const graffitiBg = document.getElementById('graffiti-bg');
const interactiveCard = document.getElementById('interactiveCard');
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('bookSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// Ensure background stays completely static without zoom or transform overrides
if (graffitiBg) {
  graffitiBg.style.transform = 'none';
}

/*========================================
    IN-APP BROWSER (MESSENGER / WHATSAPP) DETECTOR
========================================*/

(function checkInAppBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  
  const isInApp = (ua.indexOf("FBAN") > -1) || 
                  (ua.indexOf("FBAV") > -1) || 
                  (ua.indexOf("Instagram") > -1) || 
                  (ua.indexOf("WhatsApp") > -1);

  if (isInApp) {
    const banner = document.getElementById("iab-banner");
    const actionBtn = document.getElementById("iab-action-btn");
    const message = document.getElementById("iab-message");

    if (!banner) return;

    banner.style.display = "block";

    if (/android/i.test(ua)) {
      if (actionBtn) {
        actionBtn.href = "intent://urbannoir.github.io#Intent;scheme=https;package=com.android.chrome;end;";
      }
    } else {
      if (actionBtn) actionBtn.style.display = "none";
      if (message) {
        message.innerHTML = '⚠️ <strong>App Browser Detected:</strong> Tap the <strong>three dots (••• or ⋮)</strong> in the corner and select <strong>"Open in Safari / Browser"</strong>.';
      }
    }
  }
})();

/*========================================
    INSTANT PROFILE PHOTO SYSTEM
========================================*/

const AVATAR_CACHE_KEY = "ug_user_avatar_cache";

(function loadCachedAvatarImmediately() {
  const cachedPhoto = localStorage.getItem(AVATAR_CACHE_KEY);
  if (cachedPhoto) applyProfilePhotoToDOM(cachedPhoto);
})();

function applyProfilePhotoToDOM(photoUrl) {
  if (!photoUrl) return;
  const targets = [
    document.getElementById("mobileProfilePic"),
    document.getElementById("desktopProfilePic"),
    document.getElementById("publishAvatar")
  ];
  targets.forEach((img) => {
    if (img && img.src !== photoUrl) img.src = photoUrl;
  });
}

function setProfilePhoto(photoUrl) {
  if (!photoUrl) return;
  localStorage.setItem(AVATAR_CACHE_KEY, photoUrl);
  applyProfilePhotoToDOM(photoUrl);
}

/*========================================
        AUTH GUARD & HANDLERS
========================================*/

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem(AVATAR_CACHE_KEY);
    window.location.href = "login.html";
    return;
  }
  
  currentFirebaseUser = user;
  if (user.photoURL) setProfilePhoto(user.photoURL);
  
  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().photo?.trim()) {
      setProfilePhoto(docSnap.data().photo);
    }
  } catch (e) {
    console.error("Error fetching Firestore photo:", e);
  }
  
  loadBookFeeds();
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
    CLOUDFLARE WORKER BOOKS FEED ENGINE
========================================*/

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function createBookCardHTML(post) {
  let mediaHtml = "";
  if (post.file_id) {
    const imageUrl = `${API_URL}/image?file_id=${post.file_id}`;
    mediaHtml = `
      <div class="book-cover-wrapper">
        <img src="${imageUrl}" alt="Cover Image" class="book-cover" loading="lazy">
      </div>
    `;
  }

  let docBtnHtml = "";
  if (post.doc_id) {
    const fileName = post.doc_name || "Download";
    const docDownloadUrl = `${API_URL}/document?doc_id=${post.doc_id}&filename=${encodeURIComponent(fileName)}`;

    docBtnHtml = `
      <a href="${docDownloadUrl}"
         class="download-btn doc-download-btn"
         data-post-id="${post.id}"
         title="Download">
      </a>
    `;
  }

  let deleteBtnHtml = "";
  if (currentFirebaseUser) {
    const isOwner = post.publisher_uid && post.publisher_uid === currentFirebaseUser.uid;
    const isDeveloper = currentFirebaseUser.uid === DEVELOPER_UID;
    if (isOwner || isDeveloper) {
      deleteBtnHtml = `
        <button type="button" class="delete-post-btn" data-post-id="${post.id}" title="Delete Post">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    }
  }

  const authorHtml = post.author ? `<div class="book-author">By: ${escapeHTML(post.author)}</div>` : "";
  const categoryHtml = post.category ? `<div class="book-category">${escapeHTML(post.category)}</div>` : "";
  const tagsHtml = post.tags ? `<div class="book-tags">#${escapeHTML(post.tags)}</div>` : "";

  return `
    <article class="book-card">
      ${deleteBtnHtml}
      ${mediaHtml}
      <div class="book-info">
        <h3 class="book-title" title="${escapeHTML(post.caption || "Untitled")}">${escapeHTML(post.caption || "Untitled")}</h3>
        ${authorHtml}
        ${categoryHtml}
        ${tagsHtml}
        ${docBtnHtml}
      </div>
    </article>
  `;
}

function renderPosts(posts) {
  if (!booksContainer) return;
  if (!posts || posts.length === 0) {
    booksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem; grid-column: 1 / -1; text-align: center; padding: 20px 0;">No matching publications found.</p>`;
    return;
  }

  let latestHTML = "";
  posts.forEach((post) => {
    latestHTML += createBookCardHTML(post);
  });
  booksContainer.innerHTML = latestHTML;
  attachFeedEventListeners();
}

async function loadBookFeeds() {
  if (!booksContainer) return;

  try {
    const response = await fetch(`${API_URL}/posts?limit=30`);
    const data = await response.json();

    if (!data.success || !data.posts || data.posts.length === 0) {
      booksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No publications found yet.</p>`;
      return;
    }

    allFetchedPosts = data.posts;
    renderPosts(allFetchedPosts);

  } catch (error) {
    console.error("Error fetching feed from Worker:", error);
    booksContainer.innerHTML = `<p style="color: #ff4d4d; font-size: 0.9rem;">Failed to load books from tunnel network.</p>`;
  }
}

/*========================================
    SEARCH & FILTER ENGINE
========================================*/

function handleSearchFilter() {
  if (!searchInput) return;
  const query = searchInput.value.toLowerCase().trim();

  if (clearSearchBtn) {
    if (query.length > 0) {
      clearSearchBtn.classList.add("active");
    } else {
      clearSearchBtn.classList.remove("active");
    }
  }

  if (!query) {
    renderPosts(allFetchedPosts);
    return;
  }

  const filtered = allFetchedPosts.filter((post) => {
    const tags = (post.tags || "").toLowerCase();
    const title = (post.caption || "").toLowerCase();
    const author = (post.author || "").toLowerCase();
    const category = (post.category || "").toLowerCase();

    return (
      tags.includes(query) ||
      title.includes(query) ||
      author.includes(query) ||
      category.includes(query)
    );
  });

  renderPosts(filtered);
}

searchInput?.addEventListener("input", handleSearchFilter);

clearSearchBtn?.addEventListener("click", () => {
  if (searchInput) {
    searchInput.value = "";
    handleSearchFilter();
    searchInput.focus();
  }
});

function attachFeedEventListeners() {
  document.querySelectorAll(".doc-download-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const postId = e.currentTarget.getAttribute("data-post-id");
      if (postId) {
        try {
          await fetch(`${API_URL}/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId })
          });
        } catch (err) {
          console.error("Error updating download count:", err);
        }
      }
    });
  });

  document.querySelectorAll(".delete-post-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const postId = e.currentTarget.getAttribute("data-post-id");
      if (!confirm("Are you sure you want to delete this signal?")) return;

      try {
        const response = await fetch(`${API_URL}/posts`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: postId,
            requestingUid: currentFirebaseUser ? currentFirebaseUser.uid : ""
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          loadBookFeeds();
        } else {
          alert(`Deletion failed: ${resData.error || 'Unauthorized'}`);
        }
      } catch (err) {
        console.error("Error deleting post:", err);
        alert("Server communication failed.");
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBookFeeds);
} else {
  loadBookFeeds();
}

/*========================================
    AUTO IMAGE SLIDER ENGINE
========================================*/
(function initAutoSlider() {
  const slidesContainer = document.getElementById('imageSlides');
  const dots = document.querySelectorAll('.slider-dots .dot');
  if (!slidesContainer || dots.length === 0) return;

  let currentSlide = 0;
  const totalSlides = dots.length;
  const slideInterval = 3500;

  function goToSlide(index) {
    currentSlide = index;
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    goToSlide(currentSlide);
  }

  let autoSlideTimer = setInterval(nextSlide, slideInterval);

  dots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'), 10);
      goToSlide(index);
      clearInterval(autoSlideTimer);
      autoSlideTimer = setInterval(nextSlide, slideInterval);
    });
  });

  const sliderContainer = document.getElementById('interactiveCard');
  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', () => clearInterval(autoSlideTimer));
    sliderContainer.addEventListener('mouseleave', () => {
      autoSlideTimer = setInterval(nextSlide, slideInterval);
    });
  }
})();

/*========================================
    MOUSE GLOW & CARD PARALLAX (NO BG ZOOM)
========================================*/

function updateMouseEffects() {
  // Glow moves with the mouse pointer
  if (glow) glow.style.transform = `translate3d(${mouseX - 225}px, ${mouseY - 225}px, 0)`;

  // Interactive Card Tilt
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
    requestAnimationFrame(updateMouseEffects);
    ticking = true;
  }
}, { passive: true });

/*========================================
        POWER FLICKER ENGINE
========================================*/

(function powerFlickerEngine() {
  function flicker() {
    document.body.classList.add("power-flicker");

    setTimeout(() => {
      document.body.classList.remove("power-flicker");
    }, 180);

    const next = 8000 + Math.random() * 4000;
    setTimeout(flicker, next);
  }

  setTimeout(flicker, 10000);
})();

/*========================================
        GLITCH DISTORTION ENGINE
========================================*/

(function glitchEngine() {
  const glitchTargets = [graffitiBg, document.querySelector('.hero-title')].filter(Boolean);

  function triggerGlitch() {
    if (glitchTargets.length === 0) return;

    glitchTargets.forEach(el => el.classList.add('glitch-active'));

    setTimeout(() => {
      glitchTargets.forEach(el => el.classList.remove('glitch-active'));
    }, 120 + Math.random() * 130);

    const nextGlitch = 5000 + Math.random() * 7000;
    setTimeout(triggerGlitch, nextGlitch);
  }

  setTimeout(triggerGlitch, 4000);
})();
