document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const newPasswordError = document.getElementById("newPasswordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const submitBtn = document.getElementById("submitBtn");

  document.querySelectorAll(".toggle-password-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const targetInput = document.getElementById(targetId);
      const icon = button.querySelector("i");
      if (targetInput) {
        const isPassword = targetInput.type === "password";
        targetInput.type = isPassword ? "text" : "password";
        if (icon) {
          icon.classList.toggle("fa-eye");
          icon.classList.toggle("fa-eye-slash");
        }
      }
    });
  });

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

  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", () => clearError(newPasswordInput, newPasswordError));
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => clearError(confirmPasswordInput, confirmPasswordError));
  }

  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(newPasswordInput, newPasswordError);
    clearError(confirmPasswordInput, confirmPasswordError);

    const newPassword = newPasswordInput ? newPasswordInput.value.trim() : "";
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";
    let isValid = true;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;

    if (!newPassword) {
      showError(newPasswordInput, newPasswordError, "Please enter a new password.");
      isValid = false;
    } else if (!passwordRegex.test(newPassword)) {
      showError(
        newPasswordInput,
        newPasswordError,
        "Must be 12+ chars with uppercase, lowercase, number, and special character (!, @, #, $)."
      );
      isValid = false;
    }

    if (!confirmPassword) {
      showError(confirmPasswordInput, confirmPasswordError, "Please confirm your new password.");
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      showError(confirmPasswordInput, confirmPasswordError, "Passwords do not match. Please verify.");
      isValid = false;
    }

    if (!isValid) return;

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    submitBtn.disabled = true;

    try {
      const response = await fetch("/admin/reset-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Password Updated!",
          text: "Redirecting to your dashboard...",
          timer: 2000,
          showConfirmButton: false,
          heightAuto: false,
        }).then(() => {
          window.location.href = data.redirectUrl;
        });
      } else {
        showError(confirmPasswordInput, confirmPasswordError, data.message || "Failed to update password.");
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: data.message,
          heightAuto: false,
        });

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Reset Password Error:", error);
      Swal.fire({
        icon: "error",
        title: "System Error",
        text: "Something went wrong.",
        heightAuto: false,
      });

      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
});