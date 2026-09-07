document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

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

  const addressModal = document.getElementById("addressModal");
  const deleteModal = document.getElementById("deleteConfirmModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalSaveBtn = document.getElementById("modalSaveBtn");
  const editAddressTargetId = document.getElementById("editAddressTargetId");
  const deleteAddressTargetId = document.getElementById("deleteAddressTargetId");

  function clearModalErrors() {
    document.querySelectorAll("#addressModal .field-error-msg").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll("#addressModal .form-control").forEach((input) => {
      input.classList.remove("input-error");
    });
  }

  document.querySelectorAll("#addressModal .form-control").forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("input-error");
      const errEl = input.parentElement.querySelector(".field-error-msg");
      if (errEl) errEl.textContent = "";
    });
  });

  const enforceNumericOnly = (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, "");
  };
  const phoneInput = document.getElementById("fieldPhone");
  const pincodeInput = document.getElementById("fieldPincode");
  if (phoneInput) phoneInput.addEventListener("input", enforceNumericOnly);
  if (pincodeInput) pincodeInput.addEventListener("input", enforceNumericOnly);

  function closeAllMenus() {
    document
      .querySelectorAll(".address-dropdown.open")
      .forEach((d) => d.classList.remove("open"));
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".address-menu-wrapper")) {
      closeAllMenus();
    }
  });

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".address-selection-card");
    if (!card) return;
    if (
      e.target.closest(".address-menu-wrapper") ||
      e.target.closest(".modal-overlay")
    ) {
      return;
    }
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".hamburger-btn");
    if (!btn) return;
    e.stopPropagation();
    const wrapper = btn.closest(".address-menu-wrapper");
    const dropdown = wrapper.querySelector(".address-dropdown");
    const isOpen = dropdown.classList.contains("open");
    closeAllMenus();
    if (!isOpen) dropdown.classList.add("open");
  });

  const openAddAddressModalBtn = document.getElementById("openAddAddressModalBtn");
  if (openAddAddressModalBtn) {
    openAddAddressModalBtn.addEventListener("click", () => {
      closeAllMenus();
      clearModalErrors();
      modalTitle.textContent = "Add Address";
      modalSaveBtn.textContent = "Add Address";
      editAddressTargetId.value = "";

      document.getElementById("fieldName").value = "";
      document.getElementById("fieldPhone").value = "";
      document.getElementById("fieldPincode").value = "";
      document.getElementById("fieldCity").value = "";
      document.getElementById("fieldState").value = "";
      document.getElementById("fieldAddress").value = "";
      document.getElementById("typeHome").checked = true;
      document.getElementById("fieldDefault").checked = false;

      addressModal.classList.add("active");
    });
  }

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-address-trigger-btn");
    if (!editBtn) return;
    closeAllMenus();
    clearModalErrors();

    const d = editBtn.dataset;
    modalTitle.textContent = "Edit Address";
    modalSaveBtn.textContent = "Save Changes";
    editAddressTargetId.value = d.id;

    document.getElementById("fieldName").value = d.name || "";
    document.getElementById("fieldPhone").value = d.phone || "";
    document.getElementById("fieldPincode").value = d.pincode || "";
    document.getElementById("fieldCity").value = d.city || "";
    document.getElementById("fieldState").value = d.state || "";
    document.getElementById("fieldAddress").value = d.address || "";

    const rawType = (d.type || "Home").toLowerCase();
    const capitalizedType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    const typeInput =
      document.querySelector(`input[name="addr-type"][value="${capitalizedType}"]`) ||
      document.querySelector(`input[name="addr-type"][value="${rawType}"]`);
    if (typeInput) typeInput.checked = true;

    document.getElementById("fieldDefault").checked = d.default === "true";

    addressModal.classList.add("active");
  });

  function closeAddressModal() {
    if (addressModal) addressModal.classList.remove("active");
    clearModalErrors();
  }

  document.getElementById("closeAddressModalBtn")?.addEventListener("click", closeAddressModal);
  document.getElementById("cancelModalBtn")?.addEventListener("click", closeAddressModal);

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", async () => {
      clearModalErrors();

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

      const selectedRadioVal = document.querySelector('input[name="addr-type"]:checked')?.value || "Home";
      const addressType = selectedRadioVal.charAt(0).toUpperCase() + selectedRadioVal.slice(1).toLowerCase();

      const isDefault = document.getElementById("fieldDefault").checked;
      const targetId = editAddressTargetId.value;

      let hasError = false;

      if (!name) {
        document.getElementById("checkoutNameError").textContent = "Full name is required.";
        nameInput.classList.add("input-error");
        hasError = true;
      } else if (name.length < 3) {
        document.getElementById("checkoutNameError").textContent = "Name must be at least 3 characters long.";
        nameInput.classList.add("input-error");
        hasError = true;
      }

      if (!phone) {
        document.getElementById("checkoutPhoneError").textContent = "Phone number is required.";
        phoneInputEl.classList.add("input-error");
        hasError = true;
      } else if (!/^[0-9]{10}$/.test(phone)) {
        document.getElementById("checkoutPhoneError").textContent = "Enter a valid 10-digit mobile number.";
        phoneInputEl.classList.add("input-error");
        hasError = true;
      }

      if (!pincode) {
        document.getElementById("checkoutPincodeError").textContent = "Pincode is required.";
        pincodeInputEl.classList.add("input-error");
        hasError = true;
      } else if (!/^[0-9]{6}$/.test(pincode)) {
        document.getElementById("checkoutPincodeError").textContent = "Enter a valid 6-digit pincode.";
        pincodeInputEl.classList.add("input-error");
        hasError = true;
      }

      if (!city) {
        document.getElementById("checkoutCityError").textContent = "City is required.";
        cityInput.classList.add("input-error");
        hasError = true;
      }

      if (!state) {
        document.getElementById("checkoutStateError").textContent = "State is required.";
        stateInput.classList.add("input-error");
        hasError = true;
      }

      if (!fullAddress) {
        document.getElementById("checkoutAddressError").textContent = "Full address is required.";
        fullAddressInput.classList.add("input-error");
        hasError = true;
      } else if (fullAddress.length < 10) {
        document.getElementById("checkoutAddressError").textContent = "Address must be at least 10 characters.";
        fullAddressInput.classList.add("input-error");
        hasError = true;
      }

      if (hasError) return;

      const payload = {
        addressType,
        name,
        phone,
        fullAddress,
        city,
        state,
        pincode,
        isDefault,
      };

      const isEdit = Boolean(targetId);
      const url = isEdit
        ? `/user/checkout/address/edit/${targetId}`
        : "/user/checkout/address/add";
      const method = isEdit ? "PATCH" : "POST";

      modalSaveBtn.disabled = true;
      modalSaveBtn.textContent = "Saving...";

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          closeAddressModal();
          Swal.fire({
            icon: "success",
            title: isEdit ? "Address Updated" : "Address Added",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => window.location.reload());
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Operation failed.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to reach the server. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        modalSaveBtn.disabled = false;
        modalSaveBtn.textContent = isEdit ? "Save Changes" : "Add Address";
      }
    });
  }

  document.addEventListener("click", (e) => {
    const delBtn = e.target.closest(".delete-address-trigger-btn");
    if (!delBtn) return;
    closeAllMenus();
    deleteAddressTargetId.value = delBtn.getAttribute("data-id");
    deleteModal.classList.add("active");
  });

  function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.remove("active");
  }

  document.getElementById("closeDeleteModalBtn")?.addEventListener("click", closeDeleteModal);
  document.getElementById("cancelDeleteModalBtn")?.addEventListener("click", closeDeleteModal);

  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const addressId = deleteAddressTargetId.value;
      if (!addressId) return;

      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = "Deleting...";

      try {
        const response = await fetch(
          `/user/checkout/address/delete/${addressId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
              "x-csrf-token": csrfToken,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          closeDeleteModal();
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
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to complete deletion.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Yes, Delete';
      }
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === addressModal) closeAddressModal();
    if (e.target === deleteModal) closeDeleteModal();
  });

  const proceedToPaymentBtn = document.getElementById("proceedToPaymentBtn");
  if (proceedToPaymentBtn) {
    proceedToPaymentBtn.addEventListener("click", async () => {
      const selectedRadio = document.querySelector('input[name="delivery-address"]:checked');
      if (!selectedRadio) {
        return Swal.fire({
          icon: "warning",
          title: "Selection Required",
          text: "Please choose or add a delivery address to proceed.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const selectedAddressId = selectedRadio.value;

      proceedToPaymentBtn.disabled = true;
      proceedToPaymentBtn.textContent = "Processing...";

      try {
        const response = await fetch("/user/checkout/address/select", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ selectedAddressId }),
        });

        const data = await response.json();

        if (data.success && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          Swal.fire({
            icon: "warning",
            title: "Notice",
            text: data.message || "Unable to proceed to payment.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
          proceedToPaymentBtn.disabled = false;
          proceedToPaymentBtn.textContent = "Proceed to Payment";
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Network error occurred. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
        proceedToPaymentBtn.disabled = false;
        proceedToPaymentBtn.textContent = "Proceed to Payment";
      }
    });
  }
});