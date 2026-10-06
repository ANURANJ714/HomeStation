document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const otpInputs = document.querySelectorAll(".otp-input");
  const otpContainer = document.getElementById("otpContainer");
  const otpError = document.getElementById("otpError");
  const timerContainer = document.getElementById("timerContainer");
  const submitBtn = document.getElementById("submitBtn");

  function showOtpError(message) {
    if (otpError) {
      otpError.innerText = message;
      otpError.classList.add("active");
    }
    if (otpContainer) {
      otpContainer.classList.add("has-error");
    }
  }

  function clearOtpError() {
    if (otpError) {
      otpError.innerText = "";
      otpError.classList.remove("active");
    }
    if (otpContainer) {
      otpContainer.classList.remove("has-error");
    }
  }

  otpInputs.forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");
      clearOtpError();
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

  let timeLeft = 60;
  let countdown;

  function createResendLink() {
    timerContainer.innerHTML = "";
    const resendLink = document.createElement("a");
    resendLink.href = "#";
    resendLink.id = "resend-btn";
    resendLink.className = "resend-link";
    resendLink.textContent = "Resend OTP";
    timerContainer.appendChild(resendLink);
    resendLink.addEventListener("click", handleResendOtp);
  }

  async function handleResendOtp(e) {
    e.preventDefault();
    clearOtpError();

    const resendBtn = document.getElementById("resend-btn");
    resendBtn.classList.add("disabled");
    resendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    try {
      const response = await fetch("/admin/resend-otp", {
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
          title: "OTP Sent!",
          text: data.message,
          timer: 2000,
          showConfirmButton: false,
          heightAuto: false,
        });
        startTimer();
      } else {
        Swal.fire({
          icon: "warning",
          title: "Wait",
          text: data.message,
          heightAuto: false,
        });
        resendBtn.innerHTML = "Resend OTP";
        resendBtn.classList.remove("disabled");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to resend OTP.",
        heightAuto: false,
      });
      resendBtn.innerHTML = "Resend OTP";
      resendBtn.classList.remove("disabled");
    }
  }

  function startTimer() {
    clearInterval(countdown);
    timeLeft = 60;
    timerContainer.innerHTML = '<span id="timer">60</span>s remaining';
    const timerElement = document.getElementById("timer");

    countdown = setInterval(() => {
      timeLeft--;
      if (timerElement) timerElement.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(countdown);
        createResendLink();
      }
    }, 1000);
  }

  startTimer();

  document.getElementById("verifyOtpForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearOtpError();

    let otpValue = "";
    otpInputs.forEach((input) => {
      otpValue += input.value.trim();
    });

    if (!otpValue) {
      showOtpError("Please enter the verification code sent to your email.");
      return;
    }

    if (otpValue.length !== 6 || !/^\d{6}$/.test(otpValue)) {
      showOtpError("Please enter all 6 digits.");
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    submitBtn.disabled = true;

    try {
      const response = await fetch("/admin/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ otp: otpValue }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Verified!",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
          heightAuto: false,
        }).then(() => {
          window.location.href = data.redirectUrl;
        });
      } else {
        showOtpError(data.message || "Invalid OTP entered.");
        Swal.fire({
          icon: "error",
          title: "Verification Failed",
          text: data.message,
          heightAuto: false,
          confirmButtonColor: "#222",
        });
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "System Error",
        text: "Something went wrong.",
        heightAuto: false,
        confirmButtonColor: "#222",
      });
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
});