document.addEventListener("DOMContentLoaded", () => {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const submitBtn = document.getElementById("submitBtn");
  const csrfToken = document.getElementById("csrfToken").value;
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();

    if (!email) {
      return Swal.fire({
        icon: "warning",
        title: "Oops...",
        text: "Please enter your email.",
        heightAuto: false,
      });
    }

    submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    submitBtn.disabled = true;

    try {
      const response = await fetch("/admin/forgot-password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email,
        }),
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
        Swal.fire({
          icon: "error",
          title: "Request Failed",
          text: data.message,
          heightAuto: false,
        });

        submitBtn.innerHTML = "Next";
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

      submitBtn.innerHTML = "Next";
      submitBtn.disabled = false;
    }
  });
});
