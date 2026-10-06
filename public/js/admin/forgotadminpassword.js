document.addEventListener("DOMContentLoaded", () => {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const submitBtn = document.getElementById("submitBtn");
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  function showError(message) {
    if (emailError) {
      emailError.innerText = message;
      emailError.classList.add("active");
    }
    const container = emailInput?.closest(".input-container");
    if (container) {
      container.classList.add("has-error");
    }
  }

  function clearError() {
    if (emailError) {
      emailError.innerText = "";
      emailError.classList.remove("active");
    }
    const container = emailInput?.closest(".input-container");
    if (container) {
      container.classList.remove("has-error");
    }
  }

  if (emailInput) {
    emailInput.addEventListener("input", clearError);
  }

  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = emailInput ? emailInput.value.trim() : "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      showError("Please enter your registered email address.");
      return;
    } else if (!emailRegex.test(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch("/admin/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Sent!",
          text: data.message,
          timer: 2000,
          showConfirmButton: false,
          heightAuto: false,
        }).then(() => {
          window.location.href = data.redirectUrl;
        });
      } else {
        showError(data.message || "Failed to process request.");
        Swal.fire({
          icon: "error",
          title: "Request Failed",
          text: data.message,
          heightAuto: false,
        });

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Forgot Password Error:", error);
      Swal.fire({
        icon: "error",
        title: "System Error",
        text: "Something went wrong. Please try again later.",
        heightAuto: false,
      });

      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
});