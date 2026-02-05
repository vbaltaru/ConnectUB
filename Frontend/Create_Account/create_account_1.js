const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  // ✅ CORECT - fără paranteză în plus
  const continueBtn = document.querySelector(".signup-btn");

  //Verifi if email exist
  async function checkEmailExists(email) {
    try {
      const response = await fetch(`${API_BASE}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }), // ✅ CORECT - fără punct și virgulă
      });
      const result = await response.json();

      return result.exists; // ✅ CORECT - "exists" nu "exist"
    } catch (error) {
      console.error("Eroare la verificarea email-ului:", error);
      return false;
    }
  }

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  function validatePassword(password) {
    const errors = [];
    if (password.length < 8)
      errors.push("Password must be at least 8 characters long.");
    if (!/[A-Z]/.test(password))
      errors.push("Password must contain at least one uppercase letter.");
    if (!/[a-z]/.test(password))
      errors.push("Password must contain at least one lowercase letter.");
    if (!/\d/.test(password))
      errors.push("Password must contain at least one number.");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      errors.push("Password must contain at least one special character.");

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  // 🎨 FUNCȚII PENTRU AFIȘAREA ERORILOR
  function resetFieldStyles() {
    const fields = ["email", "password", "firstName", "lastName"];
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

      field.placeholder = message;
      field.style.borderColor = "#ff4444";
      field.style.color = "#ff4444";
      field.classList.add("input-error");
    }
  }

  continueBtn.addEventListener("click", async function (e) {
    console.log('🚀 Butonul a fost apăsat!');
    e.preventDefault();
    resetFieldStyles();

    const page1Data = {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      first_name: document.getElementById("firstName").value.trim(),
      last_name: document.getElementById("lastName").value.trim(),
    };

    let hasErrors = false;

    // ✅ VALIDARE EMAIL
    if (!page1Data.email) {
      showFieldError("email", "Please fill in the required field");
      hasErrors = true;
    } else if (!validateEmail(page1Data.email)) {
      showFieldError("email", "Invalid Email");
      hasErrors = true;
    } else {
      const emailExists = await checkEmailExists(page1Data.email);
      if (emailExists) {
        showFieldError("email", "Email address already in use.");
        hasErrors = true;
      }
    }

    // ✅ VALIDARE PAROLĂ
    if (!page1Data.password) {
      showFieldError("password", "Please fill in the required field");
      hasErrors = true;
    } else {
      const passwordValidation = validatePassword(page1Data.password);
      if (!passwordValidation.isValid) {
        showFieldError("password", passwordValidation.errors[0]);
        hasErrors = true;
      }
    }

    // ✅ VALIDARE NUME
    if (!page1Data.first_name) {
      showFieldError("firstName", "Please fill in the required field");
      hasErrors = true;
    }

    if (!page1Data.last_name) {
      showFieldError("lastName", "Please fill in the required field");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    localStorage.setItem("register_page1", JSON.stringify(page1Data));
    console.log(
      "Date salvate în localStorage:",
      localStorage.getItem("register_page1")
    ); 
    window.location.href = "/register_2";
    console.log("Redirect către pagina 2"); 
  });

  const fields = ["email", "password", "firstName", "lastName"];
  fields.forEach((id) => {
    const field = document.getElementById(id);
    if (field && !field.getAttribute("data-original-placeholder")) {
      field.setAttribute("data-original-placeholder", field.placeholder);
    }
  });
});
