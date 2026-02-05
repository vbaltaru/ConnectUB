// Așteptăm ca pagina să se încarce complet
document.addEventListener("DOMContentLoaded", () => {
  // =========================================
  // 1. VERIFICARE AUTENTIFICARE
  // =========================================
  const storedUser = localStorage.getItem("user");
  if (!storedUser) {
    window.location.href = "/login";
    return;
  }
  const userObj = JSON.parse(storedUser);
  const userId = userObj.id_user;

  // Referințe la elementele din HTML
  const avatarPreview = document.getElementById("avatarPreview");
  const fileInput = document.getElementById("profile_picture");
  const settingsForm = document.getElementById("settingsForm");
  const usernameDisplay = document.getElementById("username_display");
  const saveBtn = settingsForm.querySelector(".save-btn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  // Modal References
  const passwordModal = document.getElementById("passwordModal");
  const closePasswordModalBtn = document.getElementById(
    "closePasswordModalBtn"
  );
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
  const passwordForm = document.getElementById("passwordForm");

  // =========================================
  // 2. PREVIZUALIZARE IMAGINE (Instantaneu)
  // =========================================
  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      // Validare tip fișier
      if (!file.type.startsWith("image/")) {
        alert("Please select an image (JPG, PNG).");
        fileInput.value = ""; // Resetăm inputul
        return;
      }
      // Creăm un URL temporar local pentru preview
      avatarPreview.src = URL.createObjectURL(file);

      // Afișăm imaginea și ascundem placeholder-ul dacă utilizatorul încarcă o poză nouă
      avatarPreview.style.display = "block";
      const placeholder = document.getElementById("avatar-placeholder");
      if (placeholder) placeholder.style.display = "none";
    }
  });

  // =========================================
  // 3. ÎNCĂRCARE DATE PROFIL DE PE SERVER
  // =========================================
  async function loadProfile() {
    try {
      usernameDisplay.value = userObj.username || "";

      // Actualizăm imediat eticheta de username din localStorage
      const usernameLabel = document.getElementById("username_label");
      if (usernameLabel) usernameLabel.textContent = userObj.username || "User";

      // Cerere GET către server
      const res = await fetch(`/api/users/profile/${userId}`);
      const data = await res.json();

      if (data.success) {
        const u = data.user;
        // Populăm câmpurile text
        document.getElementById("first_name").value = u.first_name || "";
        document.getElementById("last_name").value = u.last_name || "";
        document.getElementById("study_year").value = u.study_year || "";
        document.getElementById("specialization").value =
          u.specialization || "";

        // Re-actualizăm eticheta cu datele proaspete de pe server
        if (usernameLabel)
          usernameLabel.textContent = u.username || userObj.username || "User";

        // LOGICĂ AVATAR / PLACEHOLDER
        const avatarContainer = document.querySelector(".avatar-container");
        let placeholder = document.getElementById("avatar-placeholder");

        const hasImage =
          u.profile_picture_url &&
          u.profile_picture_url !== "default_avatar.png" &&
          u.profile_picture_url.trim() !== "";

        if (hasImage) {
          avatarPreview.src = `${u.profile_picture_url}?t=${new Date().getTime()}`;
          avatarPreview.style.display = "block";
          if (placeholder) placeholder.style.display = "none";
        } else {
          avatarPreview.style.display = "none";

          if (!placeholder) {
            placeholder = document.createElement("div");
            placeholder.id = "avatar-placeholder";
            // Stiluri dinamice pentru placeholder
            placeholder.style.width = "160px";
            placeholder.style.height = "160px";
            placeholder.style.borderRadius = "50%";
            placeholder.style.border = "3px solid #8b70f9";
            placeholder.style.color = "#8b70f9";
            placeholder.style.backgroundColor = "#ffffff";
            placeholder.style.display = "flex";
            placeholder.style.alignItems = "center";
            placeholder.style.justifyContent = "center";
            placeholder.style.fontSize = "64px";
            placeholder.style.fontWeight = "600";
            avatarContainer.appendChild(placeholder);
          } else {
            placeholder.style.display = "flex";
          }

          const initial = (u.username || "User").charAt(0).toUpperCase();
          placeholder.textContent = initial;
        }
      }
    } catch (err) {
      console.error("Eroare la încărcare profil:", err);
      alert("Could not load profile data.");
    }
  }

  // =========================================
  // 4. SALVARE (TRIMITERE FORMULAR CĂTRE SERVER)
  // =========================================
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Oprim reîncărcarea paginii

    // Feedback vizual pe buton
    const originalBtnText = saveBtn.innerText;
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    // Folosim FormData pentru a trimite text + fișier
    const formData = new FormData();
    formData.append("first_name", document.getElementById("first_name").value);
    formData.append("last_name", document.getElementById("last_name").value);
    formData.append("study_year", document.getElementById("study_year").value);
    formData.append(
      "specialization",
      document.getElementById("specialization").value
    );

    // Adăugăm fișierul doar dacă a fost selectat unul nou
    if (fileInput.files[0]) {
      formData.append("profile_picture", fileInput.files[0]);
    }

    try {
      // Cerere PUT către server
      const res = await fetch(`/api/users/profile/${userId}`, {
        method: "PUT",
        body: formData,
        // Browserul setează automat Content-Type corect pentru FormData
      });

      const result = await res.json();

      if (result.success) {
        alert("Profile updated successfully!");
        // Actualizăm datele userului în localStorage
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user));
        }
        // Reîncărcăm pagina pentru a vedea modificările finale
        location.reload();
      } else {
        alert("Error saving: " + result.message);
      }
    } catch (err) {
      console.error("Eroare server la salvare:", err);
      alert("Connection error.");
    } finally {
      // Resetăm butonul
      saveBtn.innerText = originalBtnText;
      saveBtn.disabled = false;
    }
  });

  // =========================================
  // 5. BUTON CHANGE PASSWORD
  // =========================================
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", () => {
      passwordModal.classList.add("show");
    });
  }

  function closePasswordModal() {
    passwordModal.classList.remove("show");
    passwordForm.reset();
  }

  if (closePasswordModalBtn)
    closePasswordModalBtn.addEventListener("click", closePasswordModal);
  if (cancelPasswordBtn)
    cancelPasswordBtn.addEventListener("click", closePasswordModal);
  if (passwordModal) {
    passwordModal.addEventListener("click", (e) => {
      if (e.target === passwordModal) closePasswordModal();
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      try {
        const res = await fetch(`/api/users/change-password/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();

        if (data.success) {
          alert("Password changed successfully!");
          closePasswordModal();
        } else {
          alert("Error: " + data.message);
        }
      } catch (err) {
        console.error("Error changing password:", err);
        alert("Server connection error.");
      }
    });
  }

  // Inițializare: Încărcăm datele când pagina e gata
  loadProfile();
});
