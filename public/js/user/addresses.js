document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const addAddressModal = document.getElementById("addAddressModal");
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  let deleteId = null;

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

    if (addAddressModal) addAddressModal.classList.add("active");
  };

  const closeModal = () => {
    if (addAddressModal) addAddressModal.classList.remove("active");
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

  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    addressForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("fieldName").value.trim();
      const phone = document.getElementById("fieldPhone").value.trim();
      const pincode = document.getElementById("fieldPincode").value.trim();
      const city = document.getElementById("fieldCity").value.trim();
      const state = document.getElementById("fieldState").value.trim();
      const fullAddress = document.getElementById("fieldAddress").value.trim();
      const checkedTypeInput = document.querySelector(
        'input[name="addr-type"]:checked',
      );
      const addressType = checkedTypeInput ? checkedTypeInput.value : "Home";
      const isDefault = document.getElementById("fieldDefault").checked;

      if (!name || !phone || !pincode || !city || !state || !fullAddress) {
        return Swal.fire({
          icon: "warning",
          title: "Missing Information",
          text: "Please fill out all address fields.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Phone Number",
          text: "Please enter a valid 10-digit mobile number.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      if (!/^[0-9]{6}$/.test(pincode)) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Pincode",
          text: "Please enter a valid 6-digit pincode.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }

      const submitBtn = document.getElementById("modalSaveBtn");
      const originalBtnText = submitBtn.innerHTML;

      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      submitBtn.disabled = true;
      submitBtn.classList.add("btn-save-disabled");

      const addressId = document.getElementById("fieldId").value;
      const isEdit = addressId ? true : false;
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

      const url = addressId
        ? `/user/addresses/${addressId}`
        : "/user/addresses";
      const method = addressId ? "PATCH" : "POST";

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          closeModal();
          Swal.fire({
            icon: "success",
            title: isEdit ? "Address Edited!" : "Address Saved!",
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
            text: data.message,
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
          text: "Something went wrong.",
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
      modalDeleteBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
      modalDeleteBtn.disabled = true;

      try {
        const response = await fetch(`/user/addresses/${deleteId}`, {
          method: "DELETE",
          headers: { "CSRF-Token": csrfToken },
        });
        const data = await response.json();

        closeDeleteConfirm();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => window.location.reload());
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message,
            heightAuto: false,
          });
        }
      } catch (error) {
        closeDeleteConfirm();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Could not delete address.",
          heightAuto: false,
        });
      } finally {
        modalDeleteBtn.innerHTML = originalText;
        modalDeleteBtn.disabled = false;
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
