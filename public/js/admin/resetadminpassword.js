document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken").value;

  document.querySelectorAll(".toggle-password-btn").forEach((button) => {
    button.addEventListener("click", () => {

      const targetId = button.dataset.target;
      const passwordInput = document.getElementById(targetId);
      const icon = button.querySelector("i");
      const isPassword = passwordInput.type === "password";

      passwordInput.type = isPassword ? "text" : "password";

      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  });

  document
    .getElementById("resetPasswordForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPassword = document.getElementById("newPassword").value.trim();

      const confirmPassword = document
        .getElementById("confirmPassword")
        .value.trim();

      if (!newPassword || !confirmPassword) {
        return Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Please fill in both password fields.",
          heightAuto: false,
        });
      }

      if (newPassword !== confirmPassword) {
        return Swal.fire({
          icon: "error",
          title: "Mismatch",
          text: "Your passwords do not match. Please try again.",
          heightAuto: false,
        });
      }

      const submitBtn = document.getElementById("submitBtn");

      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

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
