document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const editBtn = document.getElementById("editBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const profileForm = document.getElementById("profileForm");
  const profileActions = document.getElementById("profileActions");
  const uploadBtn = document.getElementById("uploadBtn");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const profileImagePreview = document.getElementById("profileImagePreview");
  const passwordForm = document.getElementById("passwordForm");
  const clearPasswordBtn = document.getElementById("clearPasswordBtn");

  const inputs = [
    document.getElementById("fullName"),
    document.getElementById("phone"),
    document.getElementById("email"),
  ];

  let originalValues = {};
  let originalImageSrc = profileImagePreview ? profileImagePreview.src : "";
  let selectedFile = null;

  function toggleEdit(isEditing) {
    inputs.forEach((input) => {
      if (!input) return;
      if (input.id === "email" && input.dataset.provider === "google") {
        input.disabled = true;
      } else {
        input.disabled = !isEditing;
      }
      if (isEditing) originalValues[input.id] = input.value;
    });

    if (profileActions)
      profileActions.style.display = isEditing ? "flex" : "none";
    if (editBtn) editBtn.style.display = isEditing ? "none" : "block";
    if (uploadBtn) {
      if (isEditing) {
        uploadBtn.classList.remove("d-none");
        uploadBtn.style.display = "inline-block";
      } else {
        uploadBtn.classList.add("d-none");
        uploadBtn.style.display = "none";
      }
    }
  }

  if (editBtn) editBtn.addEventListener("click", () => toggleEdit(true));
  if (uploadBtn)
    uploadBtn.addEventListener("click", () => imageUploadInput?.click());

  if (imageUploadInput) {
    imageUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedFile = file;
      const previewUrl = URL.createObjectURL(file);
      if (profileImagePreview) profileImagePreview.src = previewUrl;
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      inputs.forEach((input) => {
        if (input) input.value = originalValues[input.id];
      });

      if (profileImagePreview) profileImagePreview.src = originalImageSrc;
      selectedFile = null;
      if (imageUploadInput) imageUploadInput.value = "";

      toggleEdit(false);
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("fullName").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const email = document.getElementById("email").value.trim();

      if (!fullName || !phone || !email) {
        return Swal.fire({
          icon: "warning",
          title: "Missing Information",
          text: "Please fill out all fields before saving.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Phone Number",
          text: "Please enter a valid 10-digit mobile number.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (
        fullName === originalValues["fullName"] &&
        phone === originalValues["phone"] &&
        email === originalValues["email"] &&
        !selectedFile
      ) {
        return Swal.fire({
          icon: "info",
          title: "No Changes Made",
          text: "You haven't altered any profile information details.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const saveBtn = profileForm.querySelector(".btn-save");
      const originalBtnText = saveBtn.innerText;
      saveBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      saveBtn.disabled = true;

      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("phone", phone);
      formData.append("email", email);

      if (selectedFile) {
        formData.append("profileImage", selectedFile);
      }

      try {
        const response = await fetch("/user/profile", {
          method: "PATCH",
          headers: { "CSRF-Token": csrfToken },
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          if (result.requiresVerification) {
            return (window.location.href = "/user/verify-email");
          }

          Swal.fire({
            icon: "success",
            title: "Saved!",
            text: result.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.href = "/user/profile";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: result.message,
            heightAuto: false,
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while saving.",
          heightAuto: false,
        });
      } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const oldPassword = document.getElementById("oldPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        return Swal.fire({
          icon: "warning",
          title: "Check Passwords",
          text: "Your new passwords do not match!",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const saveBtn = passwordForm.querySelector(".btn-save");
      const originalBtnText = saveBtn.innerText;
      saveBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
      saveBtn.disabled = true;

      try {
        const response = await fetch("/user/password", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
        });

        const result = await response.json();

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: result.message,
            confirmButtonColor: "#222",
            heightAuto: false,
          });
          passwordForm.reset();
        } else {
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: result.message,
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: "Could not connect to the server.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
      }
    });
  }

  if (clearPasswordBtn) {
    clearPasswordBtn.addEventListener("click", () => {
      if (passwordForm) passwordForm.reset();
    });
  }

  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", function () {
      const input = this.parentElement.querySelector("input");
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        this.classList.remove("fa-eye-slash");
        this.classList.add("fa-eye");
        this.style.color = "#222";
      } else {
        input.type = "password";
        this.classList.remove("fa-eye");
        this.classList.add("fa-eye-slash");
        this.style.color = "#888";
      }
    });
  });

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
