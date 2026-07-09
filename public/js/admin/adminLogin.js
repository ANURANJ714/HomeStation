document.addEventListener("DOMContentLoaded", () => {
  const adminLoginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const togglePasswordIcon = togglePasswordBtn.querySelector("i");
  const submitBtn = document.getElementById("submitBtn");

  togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    togglePasswordIcon.classList.toggle("fa-eye");
    togglePasswordIcon.classList.toggle("fa-eye-slash");
  });

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      return Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter both your email and password.",
        heightAuto: false,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return Swal.fire({
        icon: "warning",
        title: "Invalid Email",
        text: "Please enter a valid email address format.",
        heightAuto: false,
      });
    }

    submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

    submitBtn.disabled = true;

    const csrfToken = document.getElementById("csrfToken").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email,
          password,
        }),
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
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: data.message,
          confirmButtonColor: "#1a1a1a",
          heightAuto: false,
        });

        submitBtn.innerHTML = "Access Dashboard";
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

      submitBtn.innerHTML = "Access Dashboard";
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
