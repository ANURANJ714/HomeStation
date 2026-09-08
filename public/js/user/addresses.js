document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const addAddressModal = document.getElementById("addAddressModal");
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  let deleteId = null;

  function clearFieldErrors() {
    document.querySelectorAll(".field-error-msg").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".form-control").forEach((input) => {
      input.classList.remove("input-error");
    });
  }

  const openModal = () => {
    const addressForm = document.getElementById("addressForm");
    if (addressForm) addressForm.reset();

    const fieldId = document.getElementById("fieldId");
    if (fieldId) fieldId.value = "";

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Add New Address";

    const saveBtn = document.getElementById("modalSaveBtn");
    if (saveBtn) {
      saveBtn.textContent = "Save Address";
      saveBtn.disabled = false;
      saveBtn.classList.remove("btn-save-disabled");
    }

    clearFieldErrors();
    if (addAddressModal) addAddressModal.classList.add("active");
  };

  const closeModal = () => {
    if (addAddressModal) addAddressModal.classList.remove("active");
    clearFieldErrors();
    const saveBtn = document.getElementById("modalSaveBtn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove("btn-save-disabled");
    }
  };

  const openDeleteConfirm = (id) => {
    deleteId = id;
    if (deleteConfirmModal) deleteConfirmModal.classList.add("active");
    const deleteBtn = document.getElementById("modalDeleteBtn");
    if (deleteBtn) {
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Yes, Delete';
      deleteBtn.disabled = false;
    }
  };

  const closeDeleteConfirm = () => {
    if (deleteConfirmModal) deleteConfirmModal.classList.remove("active");
    deleteId = null;
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("#addAddressBtn")) {
      openModal();
    }

    const hamburgerBtn = e.target.closest(".card-hamburger-trigger");
    if (hamburgerBtn) {
      const wrapper = hamburgerBtn.closest(".address-menu-wrapper");
      const dropdown = wrapper.querySelector(".address-dropdown");
      const isOpen = dropdown.classList.contains("open");
      document
        .querySelectorAll(".address-dropdown.open")
        .forEach((d) => d.classList.remove("open"));
      if (!isOpen) dropdown.classList.add("open");
    } else if (!e.target.closest(".address-menu-wrapper")) {
      document
        .querySelectorAll(".address-dropdown.open")
        .forEach((d) => d.classList.remove("open"));
    }

    const editBtn = e.target.closest(".action-edit");
    if (editBtn) {
      clearFieldErrors();
      const d = editBtn.dataset;
      document.getElementById("fieldId").value = d.id;
      document.getElementById("modalTitle").textContent = "Edit Address";

      const saveBtn = document.getElementById("modalSaveBtn");
      if (saveBtn) {
        saveBtn.textContent = "Save Changes";
        saveBtn.disabled = false;
        saveBtn.classList.remove("btn-save-disabled");
      }

      document.getElementById("fieldName").value = d.name;
      document.getElementById("fieldPhone").value = d.phone;
      document.getElementById("fieldPincode").value = d.pincode;
      document.getElementById("fieldCity").value = d.city;
      document.getElementById("fieldState").value = d.state;
      document.getElementById("fieldAddress").value = d.address;
      document.getElementById("fieldDefault").checked = d.default === "true";

      const typeInput = document.querySelector(
        `input[name="addr-type"][value="${d.type}"]`,
      );
      if (typeInput) typeInput.checked = true;

      if (addAddressModal) addAddressModal.classList.add("active");
    }

    const deleteBtn = e.target.closest(".action-delete");
    if (deleteBtn) {
      openDeleteConfirm(deleteBtn.getAttribute("data-id"));
    }

    const closeTarget = e.target.closest("[data-close]");
    if (closeTarget) {
      const targetId = closeTarget.getAttribute("data-close");
      const targetModal = document.getElementById(targetId);
      if (targetModal) targetModal.classList.remove("active");
      clearFieldErrors();
    }

    if (e.target === addAddressModal) closeModal();
    if (e.target === deleteConfirmModal) closeDeleteConfirm();
  });

  const enforceNumericOnly = (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, "");
  };
  const phoneInput = document.getElementById("fieldPhone");
  const pincodeInput = document.getElementById("fieldPincode");
  if (phoneInput) phoneInput.addEventListener("input", enforceNumericOnly);
  if (pincodeInput) pincodeInput.addEventListener("input", enforceNumericOnly);

  document.querySelectorAll("#addressForm .form-control").forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("input-error");
      const errEl = input.parentElement.querySelector(".field-error-msg");
      if (errEl) errEl.textContent = "";
    });
  });

  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    addressForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors();

      const nameInput = document.getElementById("fieldName");
      const phoneInputEl = document.getElementById("fieldPhone");
      const pincodeInputEl = document.getElementById("fieldPincode");
      const cityInput = document.getElementById("fieldCity");
      const stateInput = document.getElementById("fieldState");
      const fullAddressInput = document.getElementById("fieldAddress");

      const name = nameInput.value.trim();
      const phone = phoneInputEl.value.trim();
      const pincode = pincodeInputEl.value.trim();
      const city = cityInput.value.trim();
      const state = stateInput.value.trim();
      const fullAddress = fullAddressInput.value.trim();

      const checkedTypeInput = document.querySelector(
        'input[name="addr-type"]:checked',
      );
      const addressType = checkedTypeInput ? checkedTypeInput.value : "Home";
      const isDefault = document.getElementById("fieldDefault").checked;

      let hasError = false;

      if (!name) {
        document.getElementById("nameError").textContent = "Full name is required.";
        nameInput.classList.add("input-error");
        hasError = true;
      } else if (name.length < 3) {
        document.getElementById("nameError").textContent = "Name must be at least 3 characters long.";
        nameInput.classList.add("input-error");
        hasError = true;
      }

      if (!phone) {
        document.getElementById("phoneError").textContent = "Phone number is required.";
        phoneInputEl.classList.add("input-error");
        hasError = true;
      } else if (!/^[0-9]{10}$/.test(phone)) {
        document.getElementById("phoneError").textContent = "Enter a valid 10-digit phone number.";
        phoneInputEl.classList.add("input-error");
        hasError = true;
      }

      if (!pincode) {
        document.getElementById("pincodeError").textContent = "Pincode is required.";
        pincodeInputEl.classList.add("input-error");
        hasError = true;
      } else if (!/^[0-9]{6}$/.test(pincode)) {
        document.getElementById("pincodeError").textContent = "Enter a valid 6-digit postal pincode.";
        pincodeInputEl.classList.add("input-error");
        hasError = true;
      }

      if (!city) {
        document.getElementById("cityError").textContent = "City is required.";
        cityInput.classList.add("input-error");
        hasError = true;
      }

      if (!state) {
        document.getElementById("stateError").textContent = "State is required.";
        stateInput.classList.add("input-error");
        hasError = true;
      }

      if (!fullAddress) {
        document.getElementById("addressError").textContent = "Address detail is required.";
        fullAddressInput.classList.add("input-error");
        hasError = true;
      } else if (fullAddress.length < 10) {
        document.getElementById("addressError").textContent = "Address must be at least 10 characters.";
        fullAddressInput.classList.add("input-error");
        hasError = true;
      }

      if (hasError) return;

      const submitBtn = document.getElementById("modalSaveBtn");
      const originalBtnText = submitBtn.innerHTML;

      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      submitBtn.disabled = true;
      submitBtn.classList.add("btn-save-disabled");

      const addressId = document.getElementById("fieldId").value;
      const isEdit = Boolean(addressId);
      const payload = {
        name,
        phone,
        pincode,
        city,
        state,
        fullAddress,
        addressType,
        isDefault,
      };

      const url = addressId ? `/user/addresses/${addressId}` : "/user/addresses";
      const method = addressId ? "PATCH" : "POST";

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          closeModal();
          Swal.fire({
            icon: "success",
            title: isEdit ? "Address Updated" : "Address Saved",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => window.location.reload());
        } else {
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
          submitBtn.classList.remove("btn-save-disabled");
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to process address.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.classList.remove("btn-save-disabled");
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: "Something went wrong. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    });
  }

  const modalDeleteBtn = document.getElementById("modalDeleteBtn");
  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener("click", async () => {
      if (!deleteId) return;

      const originalText = modalDeleteBtn.innerHTML;
      modalDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
      modalDeleteBtn.disabled = true;

      try {
        const response = await fetch(`/user/addresses/${deleteId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
        });
        const data = await response.json();

        closeDeleteConfirm();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Deleted",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => window.location.reload());
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to delete address.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        closeDeleteConfirm();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Could not delete address.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        modalDeleteBtn.innerHTML = originalText;
        modalDeleteBtn.disabled = false;
      }
    });
  }
});