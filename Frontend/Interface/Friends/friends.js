document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ friends.js loaded! (Full Version: Friends, Requests, Search)");

    // 1. Verificare Autentificare
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { window.location.href = '/login'; return; }
    
    const userObj = JSON.parse(storedUser);
    const userId = userObj.id_user;

    // --- REFERINȚE DOM ---
    const friendsListContainer = document.getElementById('friendsList');
    const requestsListContainer = document.getElementById('requestsList');
    const requestsSection = document.getElementById('requests-section');
    const requestsCountBadge = document.getElementById('requests-count');
    
    // Modal Căutare
    const findModal = document.getElementById('findFriendsModal');
    const openFindModalBtn = document.getElementById('openFindModalBtn');
    const closeFindModalBtn = document.getElementById('closeFindModalBtn');
    const userSearchInput = document.getElementById('userSearchInput');
    const searchResultsList = document.getElementById('searchResultsList');

    // ==================================================
    // 2. LOGICĂ MODALĂ CĂUTARE
    // ==================================================
    function openFindModal() {
        findModal.classList.add('show');
        userSearchInput.focus();
        userSearchInput.value = '';
        searchResultsList.innerHTML = '<p class="search-placeholder">Type to search for people.</p>';
    }
    function closeFindModal() { findModal.classList.remove('show'); }

    if (openFindModalBtn) openFindModalBtn.addEventListener('click', openFindModal);
    if (closeFindModalBtn) closeFindModalBtn.addEventListener('click', closeFindModal);
    if (findModal) findModal.addEventListener('click', (e) => { if (e.target === findModal) closeFindModal(); });

    // --- Căutare Live cu Debounce ---
    let debounceTimer;
    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            searchResultsList.innerHTML = '<p class="search-placeholder">Type to search for people.</p>';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchSearchResults(query);
        }, 300);
    });

    async function fetchSearchResults(query) {
        searchResultsList.innerHTML = '<p class="search-placeholder">Searching...</p>';
        try {
            const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}&currentUserId=${userId}`);
            const data = await res.json();
            if (data.success) {
                renderSearchResults(data.users);
            } else {
                searchResultsList.innerHTML = `<p style="color: var(--danger-red);">${data.message}</p>`;
            }
        } catch (error) {
            console.error("Search error:", error);
            searchResultsList.innerHTML = '<p style="color: var(--danger-red);">Server error.</p>';
        }
    }

    function renderSearchResults(users) {
        searchResultsList.innerHTML = '';
        if (users.length === 0) {
            searchResultsList.innerHTML = '<p class="search-placeholder">No users found.</p>';
            return;
        }
        users.forEach(user => {
            const initial = user.username.charAt(0).toUpperCase();
            const resultHtml = `
                <div class="search-result-item">
                    <div class="search-user-info">
                        <div class="search-avatar-small">${initial}</div>
                        <div>
                            <h4>${user.username}</h4>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <button class="btn-add-friend js-btn-add" data-recipient-id="${user.id_user}">
                        <span class="material-symbols-rounded">person_add</span> Add
                    </button>
                </div>`;
            searchResultsList.insertAdjacentHTML('beforeend', resultHtml);
        });
    }

    // --- Trimitere Cerere (Event Delegation) ---
    searchResultsList.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('.js-btn-add');
        if (!addBtn || addBtn.classList.contains('sent')) return;

        const recipientId = addBtn.dataset.recipientId;
        addBtn.disabled = true;
        addBtn.innerHTML = 'Sending...';

        try {
            const res = await fetch('/api/requests/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requester_id: userId, recipient_id: recipientId })
            });
            const data = await res.json();

            if (data.success) {
                addBtn.classList.add('sent');
                addBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Sent';
            } else {
                alert(data.message);
                addBtn.disabled = false;
                addBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span> Add';
            }
        } catch (error) {
            console.error("Request error:", error);
            addBtn.disabled = false;
        }
    });

    // ==================================================
    // 3. LOGICĂ PAGINĂ PRINCIPALĂ (Prieteni & Cereri)
    // ==================================================
    
    // --- Cereri de Prietenie ---
    async function fetchRequests() {
        try {
            const res = await fetch(`/api/requests/received/${userId}`);
            const data = await res.json();
            if (data.success) renderRequests(data.requests);
        } catch (error) { console.error("Error requests:", error); }
    }

    function renderRequests(requests) {
        requestsListContainer.innerHTML = '';
        if (requests.length === 0) { requestsSection.style.display = 'none'; return; }
        
        requestsSection.style.display = 'block';
        requestsCountBadge.textContent = requests.length;

        requests.forEach(request => {
            const sender = request.Requester;
            const initial = sender.username.charAt(0).toUpperCase();
            const requestHtml = `
                <div class="request-card" data-request-id="${request.id}">
                    <div class="friend-avatar-placeholder" style="background-color: #f3e5f5; color: #7b1fa2;">${initial}</div>
                    <div class="friend-info"><h3>${sender.username}</h3><p class="friend-email">Wants to be friends</p></div>
                    <div class="friend-actions">
                        <button class="btn-friend-action btn-accept js-accept-btn"><span class="material-symbols-rounded">check</span> Accept</button>
                        <button class="btn-friend-action btn-reject js-reject-btn"><span class="material-symbols-rounded">close</span> Reject</button>
                    </div>
                </div>`;
            requestsListContainer.insertAdjacentHTML('beforeend', requestHtml);
        });
    }

    // --- Prieteni ---
    async function fetchFriends() {
        try {
            const res = await fetch(`/api/friends/list/${userId}`);
            const data = await res.json();
            if (data.success) renderFriends(data.friends);
        } catch (error) { console.error("Error friends:", error); }
    }

    function renderFriends(friends) {
        friendsListContainer.innerHTML = '';
        if (friends.length === 0) {
            friendsListContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-grey); margin-top: 20px;">No friends yet.</p>';
            return;
        }
        friends.forEach(friend => {
            const initial = friend.username.charAt(0).toUpperCase();
            const friendHtml = `
                <div class="friend-card">
                    <div class="friend-avatar-placeholder">${initial}</div>
                    <div class="friend-info"><h3>${friend.username}</h3><p class="friend-email">${friend.email}</p></div>
                    <div class="friend-actions">
                        <button class="btn-friend-action btn-message js-btn-message" data-id="${friend.id_user}">
                            <span class="material-symbols-rounded">chat</span> Message
                        </button>
                    </div>
                </div>`;
            friendsListContainer.insertAdjacentHTML('beforeend', friendHtml);
        });
    }

    // --- Handlers Acțiuni Cereri & Chat ---
    requestsListContainer.addEventListener('click', async (e) => {
        const acceptBtn = e.target.closest('.js-accept-btn');
        const rejectBtn = e.target.closest('.js-reject-btn');
        if (!acceptBtn && !rejectBtn) return;

        const card = e.target.closest('.request-card');
        const requestId = card.dataset.requestId;
        const status = acceptBtn ? 'accepted' : 'rejected';

        try {
            const res = await fetch(`/api/requests/respond/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) { fetchRequests(); fetchFriends(); }
        } catch (error) { console.error("Response error:", error); }
    });

    friendsListContainer.addEventListener('click', (e) => {
        const msgBtn = e.target.closest('.js-btn-message');
        if (msgBtn) {
            window.location.href = `/messages?startChat=${msgBtn.dataset.id}`;
        }
    });

    // Inițializare
    fetchFriends();
    fetchRequests();
});