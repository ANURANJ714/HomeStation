document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  function showInlineError(inputElement, errorElement, message) {
    if (errorElement) {
      errorElement.innerText = message;
      errorElement.classList.add("active");
    }
    if (inputElement) {
      inputElement.classList.add("has-error");
      inputElement.closest(".password-input-relative")?.classList.add("has-error");
    }
  }

  function clearInlineError(inputElement, errorElement) {
    if (errorElement) {
      errorElement.innerText = "";
      errorElement.classList.remove("active");
    }
    if (inputElement) {
      inputElement.classList.remove("has-error");
      inputElement.closest(".password-input-relative")?.classList.remove("has-error");
    }
  }

  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);

      if (targetInput && targetInput.type === "password") {
        targetInput.type = "text";
        this.classList.remove("fa-eye-slash");
        this.classList.add("fa-eye");
        this.style.color = "#111";
      } else if (targetInput) {
        targetInput.type = "password";
        this.classList.remove("fa-eye");
        this.classList.add("fa-eye-slash");
        this.style.color = "#888";
      }
    });
  });

  const editBtn = document.getElementById("editBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const profileForm = document.getElementById("profileForm");
  const profileActions = document.getElementById("profileActions");
  const uploadBtn = document.getElementById("uploadBtn");
  const imageUploadInput = document.getElementById("imageUploadInput");
  const profileImagePreview = document.getElementById("profileImagePreview");

  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");

  const fullNameError = document.getElementById("fullNameError");
  const phoneError = document.getElementById("phoneError");
  const emailError = document.getElementById("emailError");

  const inputs = [fullNameInput, phoneInput, emailInput];

  let originalValues = {};
  let originalImageSrc = profileImagePreview ? profileImagePreview.src : "";
  let selectedFile = null;

  function toggleEdit(isEditing) {
    clearInlineError(fullNameInput, fullNameError);
    clearInlineError(phoneInput, phoneError);
    clearInlineError(emailInput, emailError);

    inputs.forEach((input) => {
      if (!input) return;
      if (input.id === "email" && input.dataset.provider === "google") {
        input.disabled = true;
      } else {
        input.disabled = !isEditing;
      }
      if (isEditing) {
        originalValues[input.id] = input.value;
      }
    });

    if (profileActions) {
      profileActions.style.display = isEditing ? "flex" : "none";
    }
    if (editBtn) {
      editBtn.style.display = isEditing ? "none" : "block";
    }
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
  if (uploadBtn) uploadBtn.addEventListener("click", () => imageUploadInput?.click());

  if (imageUploadInput) {
    imageUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid File",
          text: "Please select a valid image file (JPG, PNG, WEBP).",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        return Swal.fire({
          icon: "warning",
          title: "File Too Large",
          text: "Profile image must be less than 5MB.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      selectedFile = file;
      const previewUrl = URL.createObjectURL(file);
      if (profileImagePreview) profileImagePreview.src = previewUrl;
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      inputs.forEach((input) => {
        if (input && originalValues[input.id] !== undefined) {
          input.value = originalValues[input.id];
        }
      });

      if (profileImagePreview) profileImagePreview.src = originalImageSrc;
      selectedFile = null;
      if (imageUploadInput) imageUploadInput.value = "";

      toggleEdit(false);
    });
  }

  if (fullNameInput) {
    fullNameInput.addEventListener("input", () => clearInlineError(fullNameInput, fullNameError));
  }
  if (phoneInput) {
    phoneInput.addEventListener("input", () => clearInlineError(phoneInput, phoneError));
  }
  if (emailInput) {
    emailInput.addEventListener("input", () => clearInlineError(emailInput, emailError));
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearInlineError(fullNameInput, fullNameError);
      clearInlineError(phoneInput, phoneError);
      clearInlineError(emailInput, emailError);

      const fullName = fullNameInput ? fullNameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";

      let isValid = true;

      const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
      if (!fullName) {
        showInlineError(fullNameInput, fullNameError, "Please enter your full name.");
        isValid = false;
      } else if (!nameRegex.test(fullName)) {
        showInlineError(fullNameInput, fullNameError, "Name can only contain letters and single spaces.");
        isValid = false;
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phone) {
        showInlineError(phoneInput, phoneError, "Please enter your phone number.");
        isValid = false;
      } else if (!phoneRegex.test(phone)) {
        showInlineError(phoneInput, phoneError, "Please enter a valid 10-digit mobile number.");
        isValid = false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        showInlineError(emailInput, emailError, "Please enter your email address.");
        isValid = false;
      } else if (!emailRegex.test(email)) {
        showInlineError(emailInput, emailError, "Please enter a valid email address.");
        isValid = false;
      }

      if (!isValid) return;

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
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
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
            text: result.message || "Profile updated successfully.",
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
            text: result.message || "Could not update profile.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (err) {
        console.error("Profile submit error:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while saving.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
      }
    });
  }

  const applyReferralForm = document.getElementById("applyReferralForm");
  const claimReferralCodeInput = document.getElementById("claimReferralCodeInput");
  const referralCodeError = document.getElementById("referralCodeError");
  const proceedReferralBtn = document.getElementById("proceedReferralBtn");
  const claimReferralContainer = document.getElementById("claimReferralContainer");

  if (claimReferralCodeInput) {
    claimReferralCodeInput.addEventListener("input", () => {
      clearInlineError(claimReferralCodeInput, referralCodeError);
    });
  }

  if (applyReferralForm) {
    applyReferralForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearInlineError(claimReferralCodeInput, referralCodeError);

      const referralCode = claimReferralCodeInput ? claimReferralCodeInput.value.trim() : "";

      if (!referralCode) {
        showInlineError(claimReferralCodeInput, referralCodeError, "Please enter a referral code.");
        return;
      }

      proceedReferralBtn.innerText = "Checking...";
      proceedReferralBtn.disabled = true;

      try {
        const response = await fetch("/user/profile/apply-referral", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ referralCode }),
        });

        const data = await response.json();

        if (data.success) {
          let timerInterval;
          Swal.fire({
            icon: "success",
            title: "Referral Applied Successfully!",
            html: `
              <p style="font-size: 15px; color: #374151; margin-bottom: 12px;">${data.message}</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin: 10px 0;">
                  <strong style="color: #166534; font-size: 16px;">+ ₹200.00 Credited</strong>
                  <p style="font-size: 12px; color: #15803d; margin: 4px 0 0 0;">Updated in your HomeStation Wallet</p>
              </div>
              <small style="color: #6b7280;">Closing in <b></b> seconds...</small>
            `,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: "Great!",
            confirmButtonColor: "#222",
            heightAuto: false,
            didOpen: () => {
              const b = Swal.getHtmlContainer().querySelector("b");
              timerInterval = setInterval(() => {
                if (b) {
                  const remaining = Math.ceil(Swal.getTimerLeft() / 1000);
                  b.textContent = remaining;
                }
              }, 100);
            },
            willClose: () => {
              clearInterval(timerInterval);
            },
          }).then(() => {
            if (claimReferralContainer) {
              claimReferralContainer.style.transition = "opacity 0.4s ease, height 0.4s ease";
              claimReferralContainer.style.opacity = "0";
              claimReferralContainer.style.height = "0";
              setTimeout(() => claimReferralContainer.remove(), 400);
            }
          });
        } else {
          showInlineError(claimReferralCodeInput, referralCodeError, data.message || "Invalid referral code.");
          Swal.fire({
            icon: "error",
            title: "Cannot Apply Code",
            text: data.message || "Failed to process referral code.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (err) {
        console.error("Apply referral exception:", err);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Failed to connect to the server. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        proceedReferralBtn.innerText = "Proceed";
        proceedReferralBtn.disabled = false;
      }
    });
  }

  const copyReferralCodeBtn = document.getElementById("copyReferralCodeBtn");
  const myReferralCodeText = document.getElementById("myReferralCodeText");
  const copyIcon = document.getElementById("copyIcon");
  const copyLabelText = document.getElementById("copyLabelText");

  if (copyReferralCodeBtn && myReferralCodeText) {
    copyReferralCodeBtn.addEventListener("click", async () => {
      const codeToCopy = myReferralCodeText.innerText.trim();
      if (!codeToCopy || codeToCopy === "NOT AVAILABLE") return;

      try {
        await navigator.clipboard.writeText(codeToCopy);
        if (copyIcon) copyIcon.className = "fa-solid fa-check";
        if (copyLabelText) copyLabelText.innerText = "Copied!";

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Referral code copied!",
          showConfirmButton: false,
          timer: 1500,
        });

        setTimeout(() => {
          if (copyIcon) copyIcon.className = "fa-regular fa-copy";
          if (copyLabelText) copyLabelText.innerText = "Copy";
        }, 2000);
      } catch (err) {
        Swal.fire({
          icon: "info",
          title: "Referral Code",
          text: `Please copy manually: ${codeToCopy}`,
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    });
  }

  const passwordForm = document.getElementById("passwordForm");
  const oldPasswordInput = document.getElementById("oldPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const oldPasswordError = document.getElementById("oldPasswordError");
  const newPasswordError = document.getElementById("newPasswordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const clearPasswordBtn = document.getElementById("clearPasswordBtn");

  if (oldPasswordInput) {
    oldPasswordInput.addEventListener("input", () => clearInlineError(oldPasswordInput, oldPasswordError));
  }
  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", () => clearInlineError(newPasswordInput, newPasswordError));
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => clearInlineError(confirmPasswordInput, confirmPasswordError));
  }

  if (clearPasswordBtn) {
    clearPasswordBtn.addEventListener("click", () => {
      if (oldPasswordInput) oldPasswordInput.value = "";
      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmPasswordInput) confirmPasswordInput.value = "";
      clearInlineError(oldPasswordInput, oldPasswordError);
      clearInlineError(newPasswordInput, newPasswordError);
      clearInlineError(confirmPasswordInput, confirmPasswordError);
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearInlineError(oldPasswordInput, oldPasswordError);
      clearInlineError(newPasswordInput, newPasswordError);
      clearInlineError(confirmPasswordInput, confirmPasswordError);

      const oldPassword = oldPasswordInput ? oldPasswordInput.value : "";
      const newPassword = newPasswordInput ? newPasswordInput.value : "";
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";
      let isPassValid = true;

      if (!oldPassword) {
        showInlineError(oldPasswordInput, oldPasswordError, "Please enter your current password.");
        isPassValid = false;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
      if (!newPassword) {
        showInlineError(newPasswordInput, newPasswordError, "Please enter a new password.");
        isPassValid = false;
      } else if (!passwordRegex.test(newPassword)) {
        showInlineError(newPasswordInput, newPasswordError, "Must be 12+ chars with uppercase, lowercase, number, and special char (!, @, #, $).");
        isPassValid = false;
      }

      if (!confirmPassword) {
        showInlineError(confirmPasswordInput, confirmPasswordError, "Please confirm your new password.");
        isPassValid = false;
      } else if (newPassword !== confirmPassword) {
        showInlineError(confirmPasswordInput, confirmPasswordError, "Passwords do not match.");
        isPassValid = false;
      }

      if (!isPassValid) return;

      const saveBtn = passwordForm.querySelector(".btn-save");
      const originalBtnText = saveBtn.innerText;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
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
          if (result.message && (result.message.toLowerCase().includes("current") || result.message.toLowerCase().includes("old"))) {
            showInlineError(oldPasswordInput, oldPasswordError, result.message);
          } else {
            showInlineError(newPasswordInput, newPasswordError, result.message);
          }

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

  const logoutForm = document.getElementById("logoutForm");
  if (logoutForm) {
    logoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formCsrf =
        logoutForm.querySelector('input[name="_csrf"]')?.value ||
        document.getElementById("csrfToken")?.value;

      try {
        const response = await fetch("/user/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": formCsrf,
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