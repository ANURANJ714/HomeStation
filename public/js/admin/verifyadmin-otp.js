document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken").value;

  const otpInputs = document.querySelectorAll(".otp-input");

  otpInputs.forEach((input) => {
    input.addEventListener("keyup", (e) => {
      const nextInput = input.nextElementSibling;

      const prevInput = input.previousElementSibling;

      input.value = input.value.replace(/[^0-9]/g, "");

      if (input.value.length === 1 && nextInput && e.key !== "Backspace") {
        nextInput.focus();
      }

      if (e.key === "Backspace" && prevInput) {
        prevInput.focus();
      }
    });
  });

  let timeLeft = 60;
  let countdown;

  const timerContainer = document.getElementById("timerContainer");

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

    const resendBtn = document.getElementById("resend-btn");

    resendBtn.classList.add("disabled");

    resendBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

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

      timerElement.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(countdown);

        createResendLink();
      }
    }, 1000);
  }

  startTimer();

  document.getElementById("verifyOtpForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      let otpValue = "";

      otpInputs.forEach((input) => {
        otpValue += input.value.trim();
      });

      if (!otpValue) {
        return Swal.fire({
          icon: "warning",
          title: "Field Required",
          text: "Please enter the verification code sent to your email.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (otpValue.length !== 6) {
        return Swal.fire({
          icon: "warning",
          title: "Incomplete",
          text: "Please enter all 6 digits.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const submitBtn = document.getElementById("submitBtn");

      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

      submitBtn.disabled = true;

      try {
        const response = await fetch("/admin/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            otp: otpValue,
          }),
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
