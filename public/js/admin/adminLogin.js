document.addEventListener("DOMContentLoaded", () => {
  const adminLoginForm = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const togglePasswordIcon = togglePasswordBtn?.querySelector("i");
  const submitBtn = document.getElementById("submitBtn");

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      if (togglePasswordIcon) {
        togglePasswordIcon.classList.toggle("fa-eye");
        togglePasswordIcon.classList.toggle("fa-eye-slash");
      }
    });
  }

  function showError(fieldInput, errorEl, message) {
    if (errorEl) {
      errorEl.innerText = message;
      errorEl.classList.add("active");
    }
    const container = fieldInput?.closest(".input-container");
    if (container) {
      container.classList.add("has-error");
    }
  }

  function clearError(fieldInput, errorEl) {
    if (errorEl) {
      errorEl.innerText = "";
      errorEl.classList.remove("active");
    }
    const container = fieldInput?.closest(".input-container");
    if (container) {
      container.classList.remove("has-error");
    }
  }

  if (emailInput) {
    emailInput.addEventListener("input", () => clearError(emailInput, emailError));
  }
  if (passwordInput) {
    passwordInput.addEventListener("input", () => clearError(passwordInput, passwordError));
  }

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(emailInput, emailError);
    clearError(passwordInput, passwordError);

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      showError(emailInput, emailError, "Please enter your Email ID.");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      showError(emailInput, emailError, "Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      showError(passwordInput, passwordError, "Please enter your password.");
      isValid = false;
    }

    if (!isValid) return;

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    submitBtn.disabled = true;

    const csrfToken = document.getElementById("csrfToken")?.value || "";

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Welcome Back!",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
          heightAuto: false,
        }).then(() => {
          window.location.href = data.redirectUrl;
        });
      } else {
        if (data.message && data.message.toLowerCase().includes("password")) {
          showError(passwordInput, passwordError, data.message);
        } else if (data.message && data.message.toLowerCase().includes("email")) {
          showError(emailInput, emailError, data.message);
        }

        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: data.message,
          confirmButtonColor: "#1a1a1a",
          heightAuto: false,
        });

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Login Error:", error);
      Swal.fire({
        icon: "error",
        title: "System Error",
        text: "Unable to connect to the server. Please try again later.",
        confirmButtonColor: "#1a1a1a",
        heightAuto: false,
      });

      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  const errorDataElement = document.getElementById("server-error-data");
  if (errorDataElement) {
    const errorMessage = errorDataElement.getAttribute("data-message");
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: errorMessage,
      confirmButtonColor: "#1a1a1a",
      heightAuto: false,
    });
  }
});