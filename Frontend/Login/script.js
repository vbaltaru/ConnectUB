const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  // --- FUNCTII AJUTATOARE ---

  // Funcție pentru a afișa erori în placeholder-ul input-ului
  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
      // Salvăm placeholder-ul original dacă nu e deja salvat
      if (!field.getAttribute("data-original-placeholder")) {
        field.setAttribute("data-original-placeholder", field.placeholder);
      }
      // Setăm mesajul de eroare ca placeholder
      field.placeholder = message;
      // Golim valoarea pentru a face placeholder-ul vizibil
      field.value = ""; 
      // Adăugăm clasa pentru stilizare roșie
      field.classList.add("input-placeholder-error");
    }
  }

  // Funcție pentru a reseta stilurile la normal
  function resetFieldStyles() {
    const fields = ["email", "password"];
    fields.forEach((id) => {
      const field = document.getElementById(id);
      if (field) {
        // Restaurăm placeholder-ul original
        const originalPlaceholder = field.getAttribute("data-original-placeholder");
        if (originalPlaceholder) {
          field.placeholder = originalPlaceholder;
        }
        // Scoatem clasa de eroare
        field.classList.remove("input-placeholder-error");
      }
    });
  }

  // --- FUNCTIE API ---

  async function loginUser(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Returnăm un obiect care conține atât statusul HTTP cât și datele JSON
      const result = await response.json();
      // Adăugăm proprietatea 'ok' pentru a verifica ușor dacă cererea a avut succes (status 2xx)
      return { ok: response.ok, ...result };

    } catch (error) {
      console.error("Login error:", error);
      // Returnăm o eroare generică în caz de probleme de rețea
      return { success: false, message: "Connection error. Please try again." };
    }
  }

  // --- EVENT LISTENER PRINCIPAL ---

  const loginBTN = document.querySelector("#Login");

  loginBTN.addEventListener("click", async function (e) {
    e.preventDefault();
    resetFieldStyles(); // Resetăm erorile vechi

    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    
    const loginData = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    // 1. Validare Locală (Client-Side)
    let hasErrors = false;
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!loginData.email) {
      showFieldError("email", "Please enter your email");
      hasErrors = true;
    } else if (!email_pattern.test(loginData.email)) {
      showFieldError("email", "Invalid Email Format");
      hasErrors = true;
    }

    if (!loginData.password) {
      showFieldError("password", "Please enter your password");
      hasErrors = true;
    }

    if (hasErrors) {
      // Dacă sunt erori locale, ne oprim aici.
      return;
    }

    // 2. Stare de încărcare (UX)
    const originalBtnText = loginBTN.innerText;
    loginBTN.innerText = "Logging in...";
    loginBTN.disabled = true;
    loginBTN.style.opacity = "0.7";

    try {
      // 3. Apel Server
      const result = await loginUser(loginData.email, loginData.password);

      // 4. Gestionare Răspuns
      if (result.success) {
        console.log("✅ Login successful");
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        window.location.href = "/interface"; 
      } else {
        console.log("❌ Login failed:", result.message);
        
        // === AICI SE GESTIONEAZĂ EROAREA DE LA SERVER ===
        // Backend-ul returnează de obicei "Invalid email or password".
        // Afișăm mesajul pe ambele câmpuri, deoarece nu știm care dintre ele e greșit.
        showFieldError("email", result.message || "Login failed");
        showFieldError("password", result.message || "Login failed");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showFieldError("email", "An unexpected error occurred.");
    } finally {
        // 5. Resetare Buton (se execută mereu)
        loginBTN.innerText = originalBtnText;
        loginBTN.disabled = false;
        loginBTN.style.opacity = "1";
    }
  });

  // Inițializare: salvăm placeholder-ele originale
  const fields = ["email", "password"];
  fields.forEach((id) => {
    const field = document.getElementById(id);
    if (field && !field.getAttribute("data-original-placeholder")) {
      field.setAttribute("data-original-placeholder", field.placeholder);
    }
  });
});