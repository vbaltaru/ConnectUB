const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  const confirmBTN = document.querySelector(".sava_profile-btn"); // ✅ Adaugă 'const'
  let profilePictureFile = null;
  const profileImageInput = document.getElementById("profileImageUpload");
  const profileImagePreview = document.getElementById("profileImagePreview");
  const uploadArea = document.querySelector(".upload-area");

  // 🖼️ Imagine de profil
  if (profileImageInput && uploadArea) {
    profileImageInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        profilePictureFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
          profileImagePreview.src = e.target.result;
          profileImagePreview.style.display = "block";
          uploadArea.querySelector(".upload-icon").style.display = "none";
          uploadArea.querySelector(".upload-text").textContent = "Change Image";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 🎨 FUNCȚII PENTRU AFIȘAREA ERORILOR
  function resetFieldStyles() {
    const fields = ["username", "Speci", "year", "gender"];
    fields.forEach((id) => {
      const field = document.getElementById(id);
      if (field) {
        const originalPlaceholder = field.getAttribute(
          "data-original-placeholder"
        );
        if (originalPlaceholder) {
          field.placeholder = originalPlaceholder;
        }
        field.style.borderColor = "";
        field.style.color = "";
        field.classList.remove("input-error");
      }
    });
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
      if (!field.getAttribute("data-original-placeholder")) {
        field.setAttribute("data-original-placeholder", field.placeholder);
      }

      field.placeholder =message; // ✅ Adaugă iconiță
      field.style.borderColor = "#ff4444";
      field.style.color = "#ff4444";
      field.classList.add("input-error");
    }
  }

  // 🔍 VERIFICĂ DACĂ USERNAME-UL EXISTĂ
  async function checkUsernameExists(username) {
    try {
      const response = await fetch(`${API_BASE}/auth/check-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });
      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error("Eroare la verificarea username-ului:", error);
      return false;
    }
  }

  confirmBTN.addEventListener("click", async function (e) {
    e.preventDefault();
    resetFieldStyles();

    // ✅ OBȚINE DATELE CORECT
    const page2Data = {
      username: document.getElementById("username").value.trim(),
      specialization: document.getElementById("Speci").value.trim(),
      study_year: parseInt(document.getElementById("year").value) || 0, // ✅ Adaugă fallback
      gender: document.getElementById("gender").value,
    };

    console.log("📝 Date pagina 2:", page2Data); // ✅ DEBUG

    let hasErrors = false;

    // ✅ VALIDARE USERNAME
    if (!page2Data.username) {
      showFieldError("username", "Please fill in the required field");
      hasErrors = true;
    } else {
      const usernameExists = await checkUsernameExists(page2Data.username); // ✅ CORECT - checkUsernameExists
      if (usernameExists) {
        showFieldError("username", "Username already in use"); // ✅ CORECT - field "username"
        hasErrors = true;
      }
    }

    // ✅ VALIDARE SPECIALIZARE
    if (!page2Data.specialization) {
      showFieldError("Speci", "Please fill in the required field");
      hasErrors = true;
    }

    // ✅ VALIDARE AN STUDII
    if (
      !page2Data.study_year ||
      page2Data.study_year < 1 ||
      page2Data.study_year > 6
    ) {
      showFieldError("year", "Please enter a valid study year (1-6)");
      hasErrors = true;
    }

    // ✅ VALIDARE GEN
    if (!page2Data.gender) {
      showFieldError("gender", "Please select your gender");
      hasErrors = true;
    }

    if (hasErrors) {
      console.log("❌ Erori de validare");
      return;
    }

    // ✅ COMBINĂ CU DATELE DIN PAGINA 1
    const page1Data = JSON.parse(
      localStorage.getItem("register_page1") || "{}"
    );
    console.log("📦 Date din pagina 1:", page1Data); // ✅ DEBUG

    const completeData = {
      ...page1Data,
      ...page2Data,
    };

    console.log("🎯 Date complete:", completeData); // ✅ DEBUG

    try {
      const formData = new FormData();

      Object.keys(completeData).forEach((key) => {
        formData.append(key, completeData[key]);
      });

      if (profilePictureFile) {
        formData.append("profile_picture", profilePictureFile);
      }

      console.log("🔄 Trimitere la backend...");

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("📨 Răspuns backend:", result);

      if (result.success) {
        localStorage.removeItem("register_page1");
        window.location.href = "../Login/login.html";
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Connection error!");
    }
  });

  const fields = ["username", "Speci", "year", "gender"];
  fields.forEach((id) => {
    const field = document.getElementById(id);
    if (field && !field.getAttribute("data-original-placeholder")) {
      field.setAttribute("data-original-placeholder", field.placeholder);
    }
  });
});
