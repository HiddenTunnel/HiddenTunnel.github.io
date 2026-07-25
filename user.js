import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Default Avatar Fallback
const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235CFF72'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

let currentUserId = localStorage.getItem("ug_current_user_id");
let searchTimeout = null;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const userList = document.getElementById('userList');
const listTitle = document.getElementById('listTitle');

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        localStorage.setItem("ug_current_user_id", user.uid);
        loadRecentChats();
    } else {
        window.location.href = "login.html";
    }
});

// Top Navigation Logout Handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("ug_current_user_id");
            window.location.href = "login.html";
        } catch (err) {
            console.error("Logout failed:", err);
        }
    });
}

// 1. Load Recent Messenger List
function loadRecentChats() {
    if (!listTitle || !userList) return;
    listTitle.textContent = "Recent Conversations";
    userList.innerHTML = `<p style="color:#666; text-align:center; padding: 15px;">Loading...</p>`;

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("members", "array-contains", currentUserId));

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            userList.innerHTML = `<p style="color:#666; text-align:center; padding: 15px;">No chats. Search users above!</p>`;
            return;
        }

        userList.innerHTML = "";
        for (let chatDoc of snapshot.docs) {
            const data = chatDoc.data();
            const peerUid = data.members.find(id => id !== currentUserId);

            if (peerUid) {
                const userDoc = await getDoc(doc(db, "users", peerUid));
                const peerData = userDoc.exists() ? userDoc.data() : {};

                const displayName = peerData.fullName || peerData.name || peerData.displayName || peerData.username || `User (${peerUid.slice(0, 5)})`;
                const avatarUrl = peerData.photo || peerData.photoURL || peerData.avatar || defaultAvatar;

                const card = document.createElement('div');
                card.className = 'chat-card';
                card.innerHTML = `
                    <div class="user-info">
                        <img class="user-avatar" src="${avatarUrl}" alt="User">
                        <div class="user-details">
                            <h4>${displayName}</h4>
                            <p class="last-msg">${data.lastMessage || 'Message now'}</p>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    window.location.href = `chat.html?chatId=${chatDoc.id}&peerUid=${peerUid}`;
                });
                userList.appendChild(card);
            }
        }
    });
}

// 2. Realtime Search Logic (With Debounce & Duplicate Prevention)
async function performSearch() {
    if (!searchInput || !listTitle || !userList) return;
    const queryText = searchInput.value.trim().toLowerCase();

    if (!queryText) {
        loadRecentChats();
        return;
    }

    listTitle.textContent = "Search Results";
    userList.innerHTML = `<p style="color:#666; text-align:center; padding: 15px;">Searching users...</p>`;

    try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        userList.innerHTML = "";

        let foundCount = 0;
        const addedUids = new Set();

        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const targetUid = docSnap.id;

            if (targetUid === currentUserId || addedUids.has(targetUid)) return;

            const name = (userData.fullName || userData.name || userData.displayName || "").toLowerCase();
            const versityId = (userData.versityId || "").toString().toLowerCase();

            if (name.includes(queryText) || versityId.includes(queryText)) {
                foundCount++;
                addedUids.add(targetUid);
                renderUserSearchResult(targetUid, userData);
            }
        });

        if (foundCount === 0) {
            userList.innerHTML = `<p style="color:#888; text-align:center; padding: 15px;">No users found for "${queryText}".</p>`;
        }
    } catch (err) {
        console.error("Search error:", err);
        userList.innerHTML = `<p style="color:#ff4d4d; text-align:center; padding: 15px;">Search error. Check console.</p>`;
    }
}

function renderUserSearchResult(targetUid, userData) {
    const displayName = userData.fullName || userData.name || userData.displayName || userData.username || 'Anonymous';
    const avatarUrl = userData.photo || userData.photoURL || userData.avatar || defaultAvatar;

    const card = document.createElement('div');
    card.className = 'chat-card';
    card.innerHTML = `
        <div class="user-info">
            <img class="user-avatar" src="${avatarUrl}" alt="User">
            <div class="user-details">
                <h4>${displayName}</h4>
                <p class="last-msg">ID: ${userData.versityId || 'N/A'}</p>
            </div>
        </div>
        <button class="start-chat-btn">MESSAGE</button>
    `;

    card.addEventListener('click', () => startChat(targetUid));
    userList.appendChild(card);
}

async function startChat(targetUid) {
    const chatId = currentUserId < targetUid ? `${currentUserId}_${targetUid}` : `${targetUid}_${currentUserId}`;
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        await setDoc(chatRef, {
            chatId: chatId,
            members: [currentUserId, targetUid],
            lastMessage: "",
            lastSenderId: "",
            isRead: true,
            updatedAt: serverTimestamp()
        });
    }
    window.location.href = `chat.html?chatId=${chatId}&peerUid=${targetUid}`;
}

if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
}

if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });
}
