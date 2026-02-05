// Inițializăm conexiunea socket.io
const socket = io();

// Preluăm datele utilizatorului logat din localStorage
const storedUser = localStorage.getItem("user");
const currentUser = JSON.parse(storedUser);

document.addEventListener("DOMContentLoaded", () => {
  // Redirecționare la login dacă utilizatorul nu este autentificat
  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  // Referințe către elementele din DOM
  const friendsListChat = document.getElementById("friendsListChat");
  const chatMessagesArea = document.getElementById("chatMessagesArea");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const fileInput = document.getElementById("fileInput");
  const currentConvIdInput = document.getElementById("currentConversationId");
  const activeChatContainer = document.getElementById("activeChatContainer");
  const noChatSelected = document.getElementById("noChatSelected");
  const currentChatName = document.getElementById("currentChatName");
  const currentChatAvatar = document.getElementById("currentChatAvatar");
  const deleteGroupBtn = document.getElementById("deleteGroupBtn");
  const userChatInfo = document.querySelector(".user-chat-info");

  // Elemente pentru Creare Grup
  const createGroupBtn = document.getElementById("createGroupBtn");
  const createGroupModal = document.getElementById("createGroupModal");
  const closeGroupModal = document.getElementById("closeGroupModal");
  const submitCreateGroup = document.getElementById("submitCreateGroup");
  const friendsSelectionList = document.getElementById("friendsSelectionList");
  const groupNameInput = document.getElementById("groupNameInput");

  // Elemente pentru Modal Membri Grup
  const groupMembersModal = document.getElementById("groupMembersModal");
  const closeMembersModal = document.getElementById("closeMembersModal");
  const groupMembersList = document.getElementById("groupMembersList");
  const groupMembersFooter = document.getElementById("groupMembersFooter");
  const leaveGroupBtnModal = document.getElementById("leaveGroupBtnModal");

  // Flag pentru a ști dacă suntem într-un grup sau chat privat
  let isGroupChat = false;

  /**
   * 1. Încărcarea listei de prieteni în sidebar-ul stâng al chat-ului
   */
  async function loadFriends() {
    try {
      const res = await fetch(`/api/friends/list/${currentUser.id_user}`);
      const data = await res.json();

      if (data.success) {
        renderFriendsList(data.friends);
        // Verificăm dacă există un parametru startChat în URL
        checkAutoStart(data.friends);
        // Încărcăm și grupurile
        loadGroups();
      }
    } catch (error) {
      console.error("Eroare la încărcarea listei de prieteni:", error);
    }
  }

  function renderFriendsList(friends) {
    friendsListChat.innerHTML = "";
    if (friends.length === 0) {
      friendsListChat.innerHTML =
        '<p style="padding: 20px; color: #64748b;">No friends added.</p>';
      return;
    }

    friends.forEach((friend) => {
      const initial = friend.username.charAt(0).toUpperCase();
      
      // Afișăm badge-ul doar dacă sunt mesaje necitite
      const unreadHtml = friend.unreadCount > 0 ? `<div class="unread-badge">${friend.unreadCount}</div>` : '';

      const friendItem = `
                <div class="friend-chat-item" id="friend-item-${friend.id_user}" onclick="openChat(${friend.id_user}, '${friend.username}')">
                    <div class="avatar-circle-sm">${initial}</div>
                    <div class="friend-info">
                        <strong>${friend.username}</strong>
                    </div>
                    ${unreadHtml}
                </div>`;
      friendsListChat.insertAdjacentHTML("beforeend", friendItem);
    });
  }

  /**
   * 2. Deschiderea unei conversații specifice
   */
  window.openChat = async (friendId, username) => {
    isGroupChat = false; // Setăm pe false pentru chat privat
    userChatInfo.style.cursor = "default"; // Nu e clickabil la chat privat
    deleteGroupBtn.style.display = "none"; // Ascundem butonul de ștergere grup
    // Stil vizual pentru item-ul selectat
    document
      .querySelectorAll(".friend-chat-item")
      .forEach((el) => el.classList.remove("active"));
    const selectedEl = document.getElementById(`friend-item-${friendId}`);
    if (selectedEl) selectedEl.classList.add("active");

    try {
      // Cerem de la server ID-ul conversației (din tabela friendships)
      const res = await fetch(
        `/api/friends/conversation/${currentUser.id_user}/${friendId}`
      );
      const data = await res.json();

      if (data.success) {
        // Afișăm fereastra de chat
        noChatSelected.style.display = "none";
        activeChatContainer.style.display = "flex";
        currentChatName.innerText = username;
        currentChatAvatar.innerText = username.charAt(0).toUpperCase();
        currentChatAvatar.style.backgroundColor = "#6366f1"; // Resetăm culoarea de fundal
        currentConvIdInput.value = data.conversationId;

        // Intrăm în camera Socket.io pentru această conversație
        socket.emit("join_room", data.conversationId);

        // Încărcăm mesajele vechi
        loadHistory(data.conversationId);

        // --- LOGICĂ NECITITE ---
        // 1. Ștergem vizual badge-ul
        const friendItem = document.getElementById(`friend-item-${friendId}`);
        if (friendItem) {
            const badge = friendItem.querySelector('.unread-badge');
            if (badge) badge.remove();
        }
        // 2. Anunțăm serverul să marcheze mesajele ca citite în DB
        socket.emit("mark_messages_read", {
            conversation_id: data.conversationId,
            reader_id: currentUser.id_user
        });
      }
    } catch (error) {
      console.error("Eroare la deschiderea chat-ului:", error);
    }
  };

  /**
   * 3. Încărcarea istoricului mesajelor din baza de date
   */
  async function loadHistory(convId) {
    try {
      // Alegem endpoint-ul corect în funcție de tipul chat-ului
      const url = isGroupChat
        ? `/api/groups/messages/${convId}`
        : `/api/messages/history/${convId}`;
      const res = await fetch(url);
      const data = await res.json();

      chatMessagesArea.innerHTML = "";
      if (data.success) {
        data.messages.forEach((msg) => appendMessage(msg));
      }
    } catch (error) {
      console.error("Eroare la încărcarea istoricului:", error);
    }
  }

  /**
   * 4. Afișarea mesajului în interfață (Trimis sau Primit)
   */
  function appendMessage(msg) {
    // Verificăm dacă mesajul este trimis de utilizatorul logat (pentru a-l pune în dreapta)
    const isSentByMe = msg.sender_id == currentUser.id_user;

    // Formatăm ora (coloana created_at din tabela ta)
    const time = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now";

    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${isSentByMe ? "sent" : "received"}`;

    // Construim conținutul în funcție de tipul mesajului (coloana message_type)
    let messageBody = "";
    if (msg.message_type === "text") {
      messageBody = `<div class="msg-text">${msg.message_text}</div>`;
    } else if (msg.message_type === "image") {
      messageBody = `<img src="${msg.file_url}" class="chat-img" onclick="window.open(this.src)">`;
    } else if (msg.message_type === "file") {
      messageBody = `<a href="${msg.file_url}" target="_blank" class="msg-file"><span class="material-symbols-rounded">description</span> ${msg.file_name}</a>`;
    }

    msgDiv.innerHTML = `
            ${messageBody}
            <span class="msg-time">${time}</span>
        `;

    chatMessagesArea.appendChild(msgDiv);

    // Auto-scroll la ultimul mesaj
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
  }

  /**
   * 5. Trimiterea unui mesaj nou
   */
  function sendMessage() {
    const text = messageInput.value.trim();
    const convId = currentConvIdInput.value;

    if (!text || !convId) return;

    let msgData = {
      sender_id: currentUser.id_user,
      message_type: "text",
      message_text: text,
      created_at: new Date().toISOString(),
      is_group: isGroupChat, // Trimitem flag-ul la server
    };

    if (isGroupChat) {
      msgData.group_id = convId;
    } else {
      msgData.conversation_id = convId;
    }

    // Trimitem prin socket către server
    socket.emit("send_message", msgData);

    // Resetăm input-ul
    messageInput.value = "";
  }

  // Evenimente pentru butoane și taste
  sendBtn.onclick = sendMessage;
  messageInput.onkeypress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // --- LOGICĂ TRIMITERE FIȘIERE ---
  fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validare simplă dimensiune (ex: max 10MB)
      if (file.size > 10 * 1024 * 1024) {
          alert("Fișierul este prea mare (max 10MB).");
          fileInput.value = '';
          return;
      }

      const formData = new FormData();
      formData.append('attachment', file);

      try {
          // 1. Încărcăm fișierul pe server
          const res = await fetch('/api/messages/attachment', {
              method: 'POST',
              body: formData
          });

          if (!res.ok) {
              if (res.status === 404) {
                  throw new Error("Ruta de upload nu a fost găsită (404). Restartează serverul backend!");
              }
              throw new Error(`Server error: ${res.status}`);
          }

          const data = await res.json();

          if (data.success) {
              // 2. Trimitem detaliile prin socket ca un mesaj normal
              const convId = currentConvIdInput.value;
              const type = data.fileType.startsWith('image/') ? 'image' : 'file';

              let msgData = {
                  sender_id: currentUser.id_user,
                  message_type: type,
                  message_text: null,
                  file_name: data.fileName,
                  file_url: data.fileUrl,
                  file_size: data.fileSize,
                  created_at: new Date().toISOString(),
                  is_group: isGroupChat,
                  [isGroupChat ? 'group_id' : 'conversation_id']: convId
              };

              socket.emit("send_message", msgData);
          } else {
              alert("Eroare la încărcare: " + data.message);
          }
      } catch (err) {
          console.error(err);
          alert("Eroare de conexiune la încărcarea fișierului.");
      }
      
      // Resetăm input-ul pentru a permite selectarea aceluiași fișier din nou
      fileInput.value = '';
  };

  /**
   * 6. Ascultarea mesajelor primite în timp real prin Socket.io
   */
  socket.on("receive_message", (msg) => {
    // Verificăm dacă mesajul primit aparține conversației deschise în acest moment
    const currentId = currentConvIdInput.value;

    // Logică pentru a afișa mesajul doar dacă suntem în chat-ul corect
    if (isGroupChat && msg.group_id == currentId) {
      appendMessage(msg);
    } else if (!isGroupChat && msg.conversation_id == currentId) {
      appendMessage(msg);
      // Dacă suntem în conversația activă, marcăm imediat ca citit
      socket.emit("mark_messages_read", {
          conversation_id: currentId,
          reader_id: currentUser.id_user
      });
    } else if (!isGroupChat) {
      // Dacă mesajul e de la altcineva (chat privat), incrementăm badge-ul
      const friendItem = document.getElementById(`friend-item-${msg.sender_id}`);
      if (friendItem) {
          let badge = friendItem.querySelector('.unread-badge');
          if (badge) {
              badge.innerText = parseInt(badge.innerText) + 1;
          } else {
              friendItem.insertAdjacentHTML('beforeend', `<div class="unread-badge">1</div>`);
          }
      }
    }
  });

  /**
   * 7. Logică Auto-Start (pentru redirecționarea de pe pagina Friends)
   */
  function checkAutoStart(friends) {
    const urlParams = new URLSearchParams(window.location.search);
    const startChatId = urlParams.get("startChat");

    if (startChatId) {
      const friend = friends.find((f) => f.id_user == startChatId);
      if (friend) {
        openChat(friend.id_user, friend.username);
      }
    }
  }

  /**
   * 8. Funcționalitate Grupuri
   */
  async function loadGroups() {
    try {
      const res = await fetch(`/api/groups/list/${currentUser.id_user}`);
      const data = await res.json();

      if (data.success && data.groups.length > 0) {
        // Adăugăm un separator vizual
        const separator =
          '<div style="padding: 15px 20px 5px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Groups</div>';
        friendsListChat.insertAdjacentHTML("beforeend", separator);

        data.groups.forEach((group) => {
          const initial = group.name.charAt(0).toUpperCase();
          
          // Verificăm dacă grupul are poză
          const avatarHtml = group.profile_picture_url 
            ? `<img src="${group.profile_picture_url}" class="avatar-circle-sm" style="object-fit: cover;">`
            : `<div class="avatar-circle-sm" style="background-color: #6366f1; color: white;">${initial}</div>`;

          const groupItem = `
                        <div class="friend-chat-item" id="group-item-${group.id}" onclick="openGroupChat(${group.id}, '${group.name}', ${group.owner_id}, '${group.profile_picture_url || ''}')">
                            ${avatarHtml}
                            <div class="friend-info">
                                <strong>${group.name}</strong>
                            </div>
                        </div>`;
          friendsListChat.insertAdjacentHTML("beforeend", groupItem);
        });
      }
    } catch (error) {
      console.error("Eroare la încărcarea grupurilor:", error);
    }
  }

  window.openGroupChat = (groupId, groupName, ownerId, groupImageUrl) => {
    isGroupChat = true; // Setăm pe true pentru grup
    userChatInfo.style.cursor = "pointer"; // Facem header-ul să pară clickabil
    // Resetăm selecția vizuală
    document
      .querySelectorAll(".friend-chat-item")
      .forEach((el) => el.classList.remove("active"));
    const selectedEl = document.getElementById(`group-item-${groupId}`);
    if (selectedEl) selectedEl.classList.add("active");

    // Afișăm zona de chat
    noChatSelected.style.display = "none";
    activeChatContainer.style.display = "flex";
    currentChatName.innerText = groupName;
    
    if (groupImageUrl && groupImageUrl !== 'null') {
        currentChatAvatar.innerHTML = `<img src="${groupImageUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        currentChatAvatar.style.backgroundColor = "transparent";
    } else {
        currentChatAvatar.innerHTML = groupName.charAt(0).toUpperCase();
        currentChatAvatar.style.backgroundColor = "#6366f1";
    }
    currentConvIdInput.value = groupId;

    // Verificăm dacă userul curent este proprietarul grupului
    if (currentUser.id_user === ownerId) {
      deleteGroupBtn.style.display = "block";
      deleteGroupBtn.onclick = () => deleteGroup(groupId);
    } else {
      deleteGroupBtn.style.display = "none";
    }

    // Socket join room
    socket.emit("join_room", groupId);

    // Încărcăm istoricul (presupunând că backend-ul gestionează mesajele de grup la fel)
    loadHistory(groupId);
  };

  async function deleteGroup(groupId) {
    if (
      !confirm(
        "Ești sigur că vrei să ștergi acest grup? Această acțiune este ireversibilă."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/groups/delete/${groupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id_user }),
      });
      const data = await res.json();

      if (data.success) {
        alert("Grup șters!");
        window.location.reload(); // Reîncărcăm pagina pentru a actualiza lista
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Eroare la ștergerea grupului:", error);
    }
  }

  // --- Logica Modalului de Creare Grup ---

  createGroupBtn.onclick = () => {
    createGroupModal.style.display = "block";
    populateFriendsSelection();
  };

  closeGroupModal.onclick = () => {
    createGroupModal.style.display = "none";
  };
  
  if (closeMembersModal) {
      closeMembersModal.onclick = () => groupMembersModal.style.display = "none";
  }

  window.onclick = (event) => {
    if (event.target == createGroupModal) {
      createGroupModal.style.display = "none";
    }
    if (event.target == groupMembersModal) {
      groupMembersModal.style.display = "none";
    }
  };

  async function populateFriendsSelection() {
    try {
      const res = await fetch(`/api/friends/list/${currentUser.id_user}`);
      const data = await res.json();
      friendsSelectionList.innerHTML = "";
      if (data.success) {
        data.friends.forEach((friend) => {
          const initial = friend.username.charAt(0).toUpperCase();
          const item = `
                        <div class="friend-select-item" onclick="document.getElementById('select-friend-${friend.id_user}').click()">
                            <input type="checkbox" id="select-friend-${friend.id_user}" value="${friend.id_user}" onclick="event.stopPropagation()">
                            <div class="avatar-circle-sm" style="width: 28px; height: 28px; font-size: 12px; margin-right: 12px; background-color: #e2e8f0; color: #475569;">${initial}</div>
                            <label for="select-friend-${friend.id_user}">${friend.username}</label>
                        </div>
                    `;
          friendsSelectionList.insertAdjacentHTML("beforeend", item);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  submitCreateGroup.onclick = async () => {
    const groupName = groupNameInput.value.trim();
    const selectedCheckboxes = friendsSelectionList.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    const memberIds = Array.from(selectedCheckboxes).map((cb) => cb.value);

    if (!groupName || memberIds.length === 0) {
      alert(
        "Te rog introdu un nume pentru grup și selectează cel puțin un prieten."
      );
      return;
    }

    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          memberIds,
          creatorId: currentUser.id_user,
        }),
      });
      const data = await res.json();
      if (data.success) {
        createGroupModal.style.display = "none";
        groupNameInput.value = "";
        // Reîncărcăm lista pentru a vedea noul grup
        loadFriends();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Eroare la crearea grupului.");
    }
  };

  // --- Logica Afișare Membri Grup ---
  
  userChatInfo.addEventListener("click", () => {
      if (isGroupChat) {
          const groupId = currentConvIdInput.value;
          // Putem lua numele și imaginea curentă din DOM sau variabile globale, dar e mai sigur să le luăm din context
          openGroupMembersModal(groupId);
      }
  });

  async function openGroupMembersModal(groupId) {
      groupMembersModal.style.display = "block";
      groupMembersList.innerHTML = '<p style="padding:10px; color:#64748b;">Loading members...</p>';
      groupMembersFooter.style.display = "none"; // Ascundem inițial butonul

      try {
          const res = await fetch(`/api/groups/members/${groupId}`);
          // Pentru a afișa poza curentă în modal, avem nevoie de detaliile grupului.
          // Putem face un fetch separat sau putem deduce din UI. 
          // Pentru simplitate, vom folosi imaginea din header-ul chat-ului curent.
          const currentImgSrc = currentChatAvatar.querySelector('img') ? currentChatAvatar.querySelector('img').src : null;
          const currentInitial = currentChatName.innerText.charAt(0).toUpperCase();
          
          if (!res.ok) {
              throw new Error(`Server error: ${res.status}`);
          }

          const data = await res.json();

          if (data.success) {
              groupMembersList.innerHTML = "";
              
              // Determinăm dacă userul curent este admin pentru a afișa controalele de upload
              // Verificăm în lista de membri cine este admin
              const currentUserMember = data.members.find(m => m.User.id_user === currentUser.id_user);
              const isOwner = currentUserMember && currentUserMember.role === 'admin';

              // Construim Header-ul Modalului cu Avatar
              let avatarHtml = currentImgSrc 
                  ? `<img src="${currentImgSrc}" class="group-modal-avatar" id="modalGroupImage">`
                  : `<div class="group-modal-avatar" style="display:flex;align-items:center;justify-content:center;font-size:32px;color:white;background-color:#6366f1;">${currentInitial}</div>`;

              let uploadHtml = isOwner 
                  ? `<label for="groupImageInput" class="group-avatar-upload-label">Change Group Photo</label>
                     <input type="file" id="groupImageInput" style="display: none;" accept="image/*">` 
                  : '';

              const headerContent = `
                  <div class="group-modal-header-content">
                      ${avatarHtml}
                      ${uploadHtml}
                  </div>
              `;
              groupMembersList.insertAdjacentHTML("beforeend", headerContent);

              // Adăugăm listener pentru upload dacă e admin
              if (isOwner) {
                  setTimeout(() => {
                      const input = document.getElementById('groupImageInput');
                      if(input) {
                          input.onchange = (e) => uploadGroupImage(e, groupId);
                      }
                  }, 100);
              }

              let isCurrentUserAdmin = false;
              data.members.forEach(member => {
                  const u = member.User;
                  const initial = u.username.charAt(0).toUpperCase();
                  const isAdmin = member.role === 'admin';

                  // Butonul de Kick apare doar dacă:
                  // 1. Eu (currentUser) sunt Admin (isOwner calculat mai sus)
                  // 2. Membrul din listă NU este Admin
                  
                  // Escapăm apostroful din nume pentru a nu strica HTML-ul inline
                  const safeUsername = u.username.replace(/'/g, "\\'");
                  let kickBtnHtml = '';
                  if (isOwner && !isAdmin) {
                      kickBtnHtml = `<span class="material-symbols-rounded btn-kick" title="Kick Member" onclick="kickMemberAction(${groupId}, ${u.id_user}, '${safeUsername}')">person_remove</span>`;
                  }
                  
                  const html = `
                      <div class="friend-select-item" style="cursor: default;">
                          <div class="avatar-circle-sm" style="margin-right: 12px; background-color: #e2e8f0; color: #475569;">${initial}</div>
                          <span style="font-weight: 500; color: #334155;">${u.username}</span>
                          ${isAdmin ? '<span style="margin-left:auto; font-size:10px; background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:12px; font-weight:700;">ADMIN</span>' : ''}
                          ${kickBtnHtml}
                      </div>
                  `;
                  groupMembersList.insertAdjacentHTML("beforeend", html);

                  // Verificăm rolul utilizatorului curent
                  if (u.id_user === currentUser.id_user && isAdmin) {
                      isCurrentUserAdmin = true;
                  }
              });

              // Dacă utilizatorul curent NU este admin, afișăm butonul de Leave Group
              if (!isCurrentUserAdmin) {
                  groupMembersFooter.style.display = "block";
                  leaveGroupBtnModal.onclick = () => leaveGroupAction(groupId);
              }
          }
      } catch (e) {
          console.error(e);
          groupMembersList.innerHTML = '<p style="padding:10px; color:red;">Error loading members.</p>';
      }
  }

  async function uploadGroupImage(event, groupId) {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("groupImage", file);
      formData.append("groupId", groupId);
      formData.append("userId", currentUser.id_user);

      try {
          const res = await fetch('/api/groups/update-image', {
              method: 'POST',
              body: formData
          });
          const data = await res.json();

          if (data.success) {
              alert("Poză actualizată!");
              // Reîncărcăm pagina pentru a vedea modificările peste tot (sidebar, header)
              window.location.reload();
          } else {
              alert(data.message);
          }
      } catch (e) { console.error(e); alert("Eroare la upload."); }
  }

  // Funcție globală pentru a fi accesibilă din HTML-ul injectat
  window.kickMemberAction = async (groupId, memberId, memberName) => {
      if (!confirm(`Ești sigur că vrei să elimini utilizatorul ${memberName} din grup?`)) return;

      try {
          const res = await fetch('/api/groups/kick', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  groupId: groupId,
                  adminId: currentUser.id_user,
                  memberIdToKick: memberId
              })
          });

          if (!res.ok) {
              if (res.status === 404) {
                  throw new Error("Ruta de kick nu a fost găsită (404). Restartează serverul backend!");
              }
              throw new Error(`Server error: ${res.status}`);
          }

          const data = await res.json();

          if (data.success) {
              if (data.groupDeleted) {
                  alert(data.message);
                  window.location.reload(); // Grupul a fost șters, reîncărcăm tot
              } else {
                  // Reîncărcăm doar lista de membri din modal
                  openGroupMembersModal(groupId);
              }
          } else {
              alert(data.message);
          }
      } catch (e) { console.error(e); alert("Eroare la eliminarea membrului."); }
  };

  async function leaveGroupAction(groupId) {
      if (!confirm("Ești sigur că vrei să părăsești acest grup?")) return;

      try {
          const res = await fetch('/api/groups/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  groupId: groupId,
                  userId: currentUser.id_user
              })
          });
          const data = await res.json();

          if (data.success) {
              alert("Ai părăsit grupul.");
              window.location.reload();
          } else {
              alert(data.message);
          }
      } catch (e) { console.error(e); }
  }

  // Pornim încărcarea inițială
  loadFriends();
});
