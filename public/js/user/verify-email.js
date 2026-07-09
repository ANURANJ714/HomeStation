document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const otpInputs = document.querySelectorAll(".otp-input");
  const emailOtpForm = document.getElementById("emailOtpForm");
  const resendOtpBtn = document.getElementById("resendOtpBtn");

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
    });

    input.addEventListener("keyup", (e) => {
      const nextInput = input.nextElementSibling;
      const prevInput = input.previousElementSibling;

      if (input.value.length === 1 && nextInput && e.key !== "Backspace") {
        nextInput.focus();
      }
      if (e.key === "Backspace" && prevInput) {
        prevInput.value = "";
        prevInput.focus();
      }
    });
  });

  if (emailOtpForm) {
    emailOtpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      let otp = "";
      otpInputs.forEach((input) => {
        otp += input.value.trim();
      });

      if (otp.length === 0) {
        return Swal.fire({
          icon: "warning",
          title: "Field Required",
          text: "Please enter the verification code sent to your email.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (otp.length !== 6) {
        return Swal.fire({
          icon: "warning",
          title: "Incomplete",
          text: "Please enter all 6 digits of the verification code.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const submitBtn = emailOtpForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
      submitBtn.disabled = true;

      try {
        const response = await fetch("/user/verify-email-change", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ otp: otp }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Email Updated!",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.href = "/user/profile";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Verification Failed",
            text: data.message,
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Fetch verification error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Server connection failed. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const originalBtnText = resendOtpBtn.innerHTML;
      resendOtpBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      resendOtpBtn.style.pointerEvents = "none";

      try {
        const response = await fetch("/user/resend-email-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "OTP Sent",
            text: data.message,
            timer: 2000,
            showConfirmButton: false,
            heightAuto: false,
          });
        } else {
          Swal.fire({
            icon: "info",
            title: "Check Inbox",
            text: data.message,
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Resend operation failed:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Could not send OTP. Please check your connection.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        resendOtpBtn.innerHTML = originalBtnText;
        resendOtpBtn.style.pointerEvents = "auto";
      }
    });
  }

  const logoutForm = document.getElementById("logoutForm");

  if (logoutForm) {
    logoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const csrfToken =
        logoutForm.querySelector('input[name="_csrf"]')?.value ||
        document.getElementById("csrfToken")?.value;

      try {
        const response = await fetch("/user/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
        });

        const data = await response.json();

        if (data.success && data.redirectUrl) {
          Swal.fire({
            icon: "success",
            title: "Goodbye!",
            text: data.message || "Logged out successfully.",
            timer: 1500, 
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.href = data.redirectUrl;
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Logout Failed",
            text: data.message || "Something went wrong.",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Logout fetch error:", error);
      }
    });
  }

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  function performSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  }

  if (searchBtn) searchBtn.addEventListener("click", performSearch);
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });
  }
});
