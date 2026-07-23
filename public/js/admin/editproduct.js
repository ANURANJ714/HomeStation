document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  function updateDateTime() {
    const display = document.getElementById("datetimeDisplay");
    if (!display) return;

    const now = new Date();
    const opts = {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    display.textContent = now.toLocaleDateString("en-IN", opts);
  }
  updateDateTime();
  setInterval(updateDateTime, 60000);

  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const sidebar = document.getElementById("appSidebar");
  const closeSidebar = document.getElementById("closeSidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (hamburgerMenu && sidebar) {
    hamburgerMenu.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      if (sidebarOverlay) sidebarOverlay.classList.toggle("active");
    });

    if (closeSidebar) {
      closeSidebar.addEventListener("click", () => {
        sidebar.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
      });
    }

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 992) {
        if (
          !sidebar.contains(e.target) &&
          !hamburgerMenu.contains(e.target) &&
          sidebar.classList.contains("active")
        ) {
          sidebar.classList.remove("active");
          if (sidebarOverlay) sidebarOverlay.classList.remove("active");
        }
      }
    });
  }

  function createVariantRow() {
    const row = document.createElement("div");
    row.className = "variant-row new-created-variant";
    row.innerHTML = `
            <div class="variant-col">
                <label>Variant Name *</label>
                <input type="text" class="v-name" placeholder="e.g. King Size">
            </div>
            <div class="variant-col">
                <label>Original Price (₹) *</label>
                <input type="number" class="v-price" placeholder="0.00" min="0" step="0.01">
            </div>
            <div class="variant-col">
                <label>Discount (%)</label>
                <input type="number" class="v-discount" placeholder="0" min="0" max="100">
            </div>
            <div class="variant-col">
                <label>Stock *</label>
                <input type="number" class="v-stock" placeholder="Qty" min="0">
            </div>
            <div class="variant-col size-col">
                <label>Length (in) *</label>
                <input type="number" class="v-length" placeholder="L" min="0" step="0.1">
            </div>
            <div class="variant-col size-col">
                <label>Width (in) *</label>
                <input type="number" class="v-width" placeholder="W" min="0" step="0.1">
            </div>
            <div class="variant-col size-col">
                <label>Height (in) *</label>
                <input type="number" class="v-height" placeholder="H" min="0" step="0.1">
            </div>
            <div class="variant-col actions-col">
                <button type="button" class="btn-icon delete remove-variant-btn">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>`;
    return row;
  }

  const variantsContainer = document.getElementById("variantsContainer");
  const addVariantBtn = document.getElementById("addVariantBtn");

  if (addVariantBtn && variantsContainer) {
    addVariantBtn.addEventListener("click", () => {
      variantsContainer.appendChild(createVariantRow());
    });
  }

  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-variant-btn");
    if (!removeBtn) return;

    const targetRow = removeBtn.closest(".variant-row");
    if (targetRow && targetRow.classList.contains("new-created-variant")) {
      targetRow.remove();
    } else {
      Swal.fire({
        icon: "error",
        title: "Action Prohibited",
        text: "Pre-existing base product variants cannot be deleted from this view.",
        heightAuto: false,
        confirmButtonColor: "#1a1a1a",
      });
    }
  });

  const croppedFilesMap = {};
  let cropperInstance = null;
  let activeBoxIndex = null;

  const cropperModal = document.getElementById("cropperModal");
  const cropperTargetImage = document.getElementById("cropperTargetImage");
  const applyCropBtn = document.getElementById("applyCropBtn");
  const cancelCropBtn = document.getElementById("cancelCropBtn");
  const closeCropperBtn = document.getElementById("closeCropperBtn");

  function closeCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    if (cropperModal) cropperModal.style.display = "none";
    activeBoxIndex = null;
  }

  if (cancelCropBtn) cancelCropBtn.addEventListener("click", closeCropper);
  if (closeCropperBtn) closeCropperBtn.addEventListener("click", closeCropper);

  document.querySelectorAll(".image-input").forEach((input) => {
    input.addEventListener("change", function () {
      const index = parseInt(this.getAttribute("data-index"), 10);
      if (this.files && this.files[0]) {
        const file = this.files[0];
        activeBoxIndex = index;

        const reader = new FileReader();
        reader.onload = (e) => {
          cropperTargetImage.src = e.target.result;
          cropperModal.style.display = "flex";

          if (cropperInstance) cropperInstance.destroy();
          cropperInstance = new Cropper(cropperTargetImage, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
          });
        };
        reader.readAsDataURL(file);
      }
    });
  });

  if (applyCropBtn) {
    applyCropBtn.addEventListener("click", () => {
      if (!cropperInstance || activeBoxIndex === null) return;

      const canvas = cropperInstance.getCroppedCanvas({
        width: 800,
        height: 800,
      });
      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const file = new File(
            [blob],
            `product-image-${activeBoxIndex + 1}.jpg`,
            { type: "image/jpeg" },
          );
          croppedFilesMap[activeBoxIndex] = file;

          const box = document.querySelector(
            `.upload-box[data-index="${activeBoxIndex}"]`,
          );
          const img = box.querySelector(".preview-img");
          const placeholder = box.querySelector(".upload-placeholder");

          img.src = URL.createObjectURL(blob);
          img.classList.remove("hidden");
          img.classList.add("show-block");
          placeholder.classList.remove("show-flex");
          placeholder.classList.add("hidden");
          box.classList.add("has-image");

          closeCropper();
        },
        "image/jpeg",
        0.9,
      );
    });
  }

  const editProductForm = document.getElementById("editProductForm");
  if (editProductForm) {
    editProductForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const form = this;
      const productId = form.getAttribute("data-product-id");
      const submitBtn = document.getElementById("saveProductBtn");
      const originalBtnText = submitBtn.innerHTML;

      const pName = document.getElementById("productName").value.trim();
      const pCat = document.getElementById("productCategory").value;
      const pDesc = document.getElementById("productDescription").value.trim();
      const pBrand = document.getElementById("productBrand").value.trim();
      const pMat = document.getElementById("productMaterial").value.trim();
      const pWarr = document.getElementById("productWarranty").value.trim();
      const pSpecs = document.getElementById("productSpecs").value.trim();

      if (!pName) {
        return Swal.fire({
          icon: "warning",
          title: "Missing Product Name",
          text: "Please enter a valid product name.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pCat) {
        return Swal.fire({
          icon: "warning",
          title: "Category Required",
          text: "Please select a category.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pDesc) {
        return Swal.fire({
          icon: "warning",
          title: "Description Required",
          text: "Please provide a product description.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pBrand) {
        return Swal.fire({
          icon: "warning",
          title: "Brand Required",
          text: "Please enter the brand name.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pMat) {
        return Swal.fire({
          icon: "warning",
          title: "Material Required",
          text: "Please specify the material type.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pWarr) {
        return Swal.fire({
          icon: "warning",
          title: "Warranty Required",
          text: "Please enter warranty information.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }
      if (!pSpecs) {
        return Swal.fire({
          icon: "warning",
          title: "Specifications Required",
          text: "Please detail the product specifications.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }

      const variantRows = document.querySelectorAll(".variant-row");
      if (variantRows.length === 0) {
        return Swal.fire({
          icon: "warning",
          title: "Missing Variants",
          text: "At least one variant must be added to the product.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }

      const variants = [];
      let variantErrorMsg = null;

      variantRows.forEach((row, i) => {
        if (variantErrorMsg) return;

        const vName = row.querySelector(".v-name").value.trim();
        const vPriceText = row.querySelector(".v-price").value.trim();
        const vStockText = row.querySelector(".v-stock").value.trim();
        const vLengthText = row.querySelector(".v-length").value.trim();
        const vWidthText = row.querySelector(".v-width").value.trim();
        const vHeightText = row.querySelector(".v-height").value.trim();

        const vPrice = parseFloat(vPriceText);
        const vDiscount =
          parseFloat(row.querySelector(".v-discount").value) || 0;
        const vStock = parseInt(vStockText, 10);
        const vLength = parseFloat(vLengthText);
        const vWidth = parseFloat(vWidthText);
        const vHeight = parseFloat(vHeightText);

        if (!vName) {
          variantErrorMsg = `Variant #${i + 1} is missing a Variant Name.`;
        } else if (isNaN(vPrice) || vPrice <= 0) {
          variantErrorMsg = `Variant #${i + 1} must have a valid price greater than 0.`;
        } else if (vDiscount < 0 || vDiscount > 100) {
          variantErrorMsg = `Variant #${i + 1} discount must be between 0 and 100%.`;
        } else if (isNaN(vStock) || vStock < 0) {
          variantErrorMsg = `Variant #${i + 1} must have a non-negative stock quantity.`;
        } else if (
          isNaN(vLength) ||
          vLength <= 0 ||
          isNaN(vWidth) ||
          vWidth <= 0 ||
          isNaN(vHeight) ||
          vHeight <= 0
        ) {
          variantErrorMsg = `Variant #${i + 1} must have positive dimensions for Length, Width, and Height.`;
        }

        variants.push({
          variantName: vName,
          originalPrice: vPrice,
          discount: vDiscount,
          stock: vStock,
          length: vLength,
          width: vWidth,
          height: vHeight,
        });
      });

      if (variantErrorMsg) {
        return Swal.fire({
          icon: "warning",
          title: "Invalid Variant Details",
          text: variantErrorMsg,
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }

      const uploadBoxes = document.querySelectorAll(".upload-box");
      const existingImagesArray = [];
      let missingImageSlot = false;

      uploadBoxes.forEach((box) => {
        const index = box.getAttribute("data-index");
        const img = box.querySelector(".preview-img");
        const existingUrl = img.getAttribute("data-existing-url") || "";

        const hasNewCrop = !!croppedFilesMap[index];
        const hasPreExisting = existingUrl.trim() !== "";

        if (!hasNewCrop && !hasPreExisting) {
          missingImageSlot = true;
        }

        if (hasPreExisting && !hasNewCrop) {
          existingImagesArray[index] = existingUrl;
        } else {
          existingImagesArray[index] = "";
        }
      });

      if (missingImageSlot) {
        return Swal.fire({
          icon: "warning",
          title: "Images Missing",
          text: "All 3 product image slots must contain a valid image.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
      }

      const formData = new FormData();
      formData.append("name", pName);
      formData.append("categoryId", pCat);
      formData.append("description", pDesc);
      formData.append("brand", pBrand);
      formData.append("material", pMat);
      formData.append("warranty", pWarr);
      formData.append("specifications", pSpecs);
      formData.append("variants", JSON.stringify(variants));
      formData.append("existingImages", JSON.stringify(existingImagesArray));
      formData.append('updatedSlotIndices', JSON.stringify(Object.keys(croppedFilesMap).map(Number)));

      Object.keys(croppedFilesMap).forEach((idx) => {
        formData.append("images", croppedFilesMap[idx]);
      });

      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      submitBtn.disabled = true;

      try {
        const response = await fetch(`/admin/products/${productId}`, {
          method: "PATCH",
          headers: {
            "CSRF-Token": csrfToken,
          },
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: data.message,
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.href = "/admin/products";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message,
            heightAuto: false,
            confirmButtonColor: "#1a1a1a",
          });
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Error updating product:", error);
        Swal.fire({
          icon: "error",
          title: "System Error",
          text: "Could not connect to the server.",
          heightAuto: false,
          confirmButtonColor: "#1a1a1a",
        });
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  const adminLogoutForm = document.getElementById("adminLogoutForm");
  if (adminLogoutForm) {
    adminLogoutForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const primaryToken =
        document.getElementById("globalCsrfTokenField")?.value || "";

      try {
        const response = await fetch("/admin/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "csrf-token": primaryToken,
          },
        });

        if (response.redirected) {
          window.location.href = response.url;
          return;
        }

        const data = await response.json();

        if (data.success || response.ok) {
          Swal.fire({
            icon: "success",
            title: "Logged Out",
            text: data.message || "Redirecting to login window...",
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.href = "/admin/login";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Logout Failed",
            text: data.message || "An error occurred.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        window.location.href = "/admin/login";
      }
    });
  }
});
