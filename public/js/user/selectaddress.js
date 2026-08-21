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
  }

  document.getElementById("closeAddressModalBtn")?.addEventListener("click", closeAddressModal);
  document.getElementById("cancelModalBtn")?.addEventListener("click", closeAddressModal);

  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", async () => {
      const name = document.getElementById("fieldName").value.trim();
      const phone = document.getElementById("fieldPhone").value.trim();
      const pincode = document.getElementById("fieldPincode").value.trim();
      const city = document.getElementById("fieldCity").value.trim();
      const state = document.getElementById("fieldState").value.trim();
      const fullAddress = document.getElementById("fieldAddress").value.trim();
      
      const selectedRadioVal = document.querySelector('input[name="addr-type"]:checked')?.value || "Home";
      const addressType = selectedRadioVal.charAt(0).toUpperCase() + selectedRadioVal.slice(1).toLowerCase();
      
      const isDefault = document.getElementById("fieldDefault").checked;
      const targetId = editAddressTargetId.value;

      if (!name || !phone || !pincode || !city || !state || !fullAddress) {
        return Swal.fire({
          icon: "warning",
          title: "Incomplete Fields",
          text: "Please fill in all mandatory address details.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (!/^\d{10}$/.test(phone)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Mobile",
          text: "Please enter a valid 10-digit phone number.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (!/^\d{6}$/.test(pincode)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Pincode",
          text: "Please enter a valid 6-digit postal code.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

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
            title: "Success",
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