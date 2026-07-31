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
const DEVELOPER_UID = "YOUR_DEVELOPER_FIREBASE_UID_HERE"; // Update with developer UID

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
let mouseX = 0, mouseY = 0;
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let ticking = false;

const glow = document.getElementById('mouse-glow');
const graffitiBg = document.getElementById('graffiti-bg');
const interactiveCard = document.getElementById('interactiveCard');
const booksContainer = document.getElementById('booksContainer');
const popularBooksContainer = document.getElementById('popularBooks');

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
  
  // Reload feeds to ensure delete button permissions evaluate properly
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
    const fileName = post.doc_name || "Download Document";
    const docDownloadUrl = `${API_URL}/document?doc_id=${post.doc_id}&filename=${encodeURIComponent(fileName)}`;
    docBtnHtml = `
      <a href="${docDownloadUrl}" class="doc-download-btn" data-post-id="${post.id}" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 14px; background: #FF7A00; color: #000; font-weight: bold; border-radius: 6px; text-decoration: none; font-size: 0.85rem;">
        <span>📄 Download ${escapeHTML(fileName)}</span>
      </a>
    `;
  }

  let deleteBtnHtml = "";
  if (currentFirebaseUser) {
    const isOwner = post.publisher_uid && post.publisher_uid === currentFirebaseUser.uid;
    const isDeveloper = currentFirebaseUser.uid === DEVELOPER_UID;
    if (isOwner || isDeveloper) {
      deleteBtnHtml = `
        <button type="button" class="btn-delete-post" data-post-id="${post.id}" style="position: absolute; top: 10px; right: 10px; background: rgba(255, 0, 0, 0.8); color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; z-index: 10;">
           Delete Book
        </button>
      `;
    }
  }

  const formattedDate = post.date ?
    new Date(post.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) :
    "Just Now";

  return `
    <article class="book-card" style="position: relative;">
      ${deleteBtnHtml}
      ${mediaHtml}
      <div class="book-info">
        <span class="book-date" style="font-size: 0.75rem; color: var(--orange); text-transform: uppercase;">${formattedDate}</span>
        <p class="book-caption" style="margin: 8px 0; color: #e0e0e0; font-size: 0.95rem;">${escapeHTML(post.caption || "Untitled Signal")}</p>
        ${docBtnHtml}
      </div>
    </article>
  `;
}

async function loadBookFeeds() {
  if (!booksContainer) return;

  try {
    const response = await fetch(`${API_URL}/posts?limit=30`);
    const data = await response.json();

    if (!data.success || !data.posts || data.posts.length === 0) {
      booksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No publications found yet.</p>`;
      if (popularBooksContainer) {
        popularBooksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No trending publications right now.</p>`;
      }
      return;
    }

    // 1. Latest Books Feed ( Chronological Order )
    let latestHTML = "";
    data.posts.forEach((post) => {
      latestHTML += createBookCardHTML(post);
    });
    booksContainer.innerHTML = latestHTML;

    // 2. Trending Books Feed ( Ranked strictly by maximum downloads )
    if (popularBooksContainer) {
      const sortedByDownloads = [...data.posts]
        .filter(p => (p.downloads || 0) > 0)
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        .slice(0, 3);

      if (sortedByDownloads.length > 0) {
        let popularHTML = "";
        sortedByDownloads.forEach((post) => {
          popularHTML += createBookCardHTML(post);
        });
        popularBooksContainer.innerHTML = popularHTML;
      } else {
        popularBooksContainer.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No downloaded trends yet.</p>`;
      }
    }

    attachFeedEventListeners();

  } catch (error) {
    console.error("Error fetching feed from Worker:", error);
    booksContainer.innerHTML = `<p style="color: #ff4d4d; font-size: 0.9rem;">Failed to load books from tunnel network.</p>`;
  }
}

function attachFeedEventListeners() {
  // Handle PDF/EPUB Download Counts
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

  // Handle Owner/Developer Deletions
  document.querySelectorAll(".btn-delete-post").forEach((btn) => {
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
        PARALLAX & MOUSE ENGINE
========================================*/

function updateParallax() {
  if (glow) glow.style.transform = `translate3d(${mouseX - 225}px, ${mouseY - 225}px, 0)`;

  const moveX = (mouseX / windowWidth - 0.5) * -25;
  const moveY = (mouseY / windowHeight - 0.5) * -25;

  if (graffitiBg) graffitiBg.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.02)`;

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
