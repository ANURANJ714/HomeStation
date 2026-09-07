document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';

    function updateDateTime() {
        const display = document.getElementById('datetimeDisplay');
        if (!display) return;
        
        const now = new Date();
        const opts = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        };
        display.textContent = now.toLocaleDateString('en-IN', opts);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('appSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });

        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            });
        }

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                }
            }
        });
    }

    function createVariantRow() {
        const row = document.createElement('div');
        row.className = 'variant-row';
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
                <label>Length (in)</label>
                <input type="number" class="v-length" placeholder="L" min="0" step="0.1">
            </div>
            <div class="variant-col size-col">
                <label>Width (in)</label>
                <input type="number" class="v-width" placeholder="W" min="0" step="0.1">
            </div>
            <div class="variant-col size-col">
                <label>Height (in)</label>
                <input type="number" class="v-height" placeholder="H" min="0" step="0.1">
            </div>
            <div class="variant-col actions-col">
                <button type="button" class="btn-icon delete remove-variant-btn">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>`;
        return row;
    }

    const variantsContainer = document.getElementById('variantsContainer');
    const addVariantBtn = document.getElementById('addVariantBtn');

    if (addVariantBtn && variantsContainer) {
        addVariantBtn.addEventListener('click', () => {
            variantsContainer.appendChild(createVariantRow());
        });
    }

    document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-variant-btn');
        if (removeBtn) {
            if (variantsContainer.children.length > 1) {
                removeBtn.closest('.variant-row').remove();
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Action Denied',
                    text: 'At least one variant is required.',
                    heightAuto: false,
                    confirmButtonColor: '#1a1a1a'
                });
            }
        }
    });

    if (variantsContainer && variantsContainer.children.length === 0) {
        variantsContainer.appendChild(createVariantRow());
    }

    const croppedFilesMap = {}; 
    const croppedBlobUrls = {};
    let cropperInstance = null;
    let activeBoxIndex = null;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    const cropperModal = document.getElementById('cropperModal');
    const cropperTargetImage = document.getElementById('cropperTargetImage');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const closeCropperBtn = document.getElementById('closeCropperBtn');

    const previewModal = document.getElementById('imagePreviewModal');
    const fullSizePreviewTarget = document.getElementById('fullSizePreviewTarget');
    const previewModalTitle = document.getElementById('previewModalTitle');
    const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');

    function closeCropper() {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        if (cropperModal) {
            cropperModal.style.display = 'none';
        }
        activeBoxIndex = null;
    }

    if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeCropper);
    if (closeCropperBtn) closeCropperBtn.addEventListener('click', closeCropper);

    document.querySelectorAll('.image-input').forEach(input => {
        input.addEventListener('change', function () {
            const index = parseInt(this.getAttribute('data-index'), 10);
            if (this.files && this.files[0]) {
                const file = this.files[0];

                if (!allowedImageTypes.includes(file.type.toLowerCase())) {
                    this.value = '';
                    return Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Format',
                        text: `The file "${file.name}" is not a supported format. Accepted: JPG, JPEG, PNG, WEBP.`,
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }

                activeBoxIndex = index;

                const reader = new FileReader();
                reader.onload = (e) => {
                    cropperTargetImage.src = e.target.result;
                    cropperModal.style.display = 'flex';

                    if (cropperInstance) cropperInstance.destroy();
                    cropperInstance = new Cropper(cropperTargetImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        background: false,
                        autoCropArea: 1,
                        responsive: true
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    });

    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            if (!cropperInstance || activeBoxIndex === null) return;

            const canvas = cropperInstance.getCroppedCanvas({ width: 800, height: 800 });
            canvas.toBlob((blob) => {
                if (!blob) return;

                const file = new File([blob], `product-image-${activeBoxIndex + 1}.jpg`, { type: 'image/jpeg' });
                croppedFilesMap[activeBoxIndex] = file;

                const blobUrl = URL.createObjectURL(blob);
                croppedBlobUrls[activeBoxIndex] = blobUrl;

                const box = document.querySelector(`.upload-box[data-index="${activeBoxIndex}"]`);
                const img = box.querySelector('.preview-img');
                const placeholder = box.querySelector('.upload-placeholder');
                const actionsOverlay = box.querySelector('.upload-box-actions');

                img.src = blobUrl;
                img.classList.remove('hidden');
                img.classList.add('show-block');
                
                placeholder.classList.remove('show-flex');
                placeholder.classList.add('hidden');
                
                if (actionsOverlay) {
                    actionsOverlay.classList.remove('hidden');
                }
                
                box.classList.add('has-image');

                closeCropper();
            }, 'image/jpeg', 0.9);
        });
    }

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-preview-btn');
        if (viewBtn) {
            e.stopPropagation();
            const idx = viewBtn.getAttribute('data-index');
            const targetUrl = croppedBlobUrls[idx];

            if (targetUrl && previewModal && fullSizePreviewTarget) {
                const titleMap = { '0': 'Main Image Preview', '1': 'Side Image 1 Preview', '2': 'Side Image 2 Preview' };
                if (previewModalTitle) previewModalTitle.textContent = titleMap[idx] || 'Product Image Preview';
                fullSizePreviewTarget.src = targetUrl;
                previewModal.style.display = 'flex';
            }
            return;
        }

        const changeBtn = e.target.closest('.change-image-btn');
        if (changeBtn) {
            e.stopPropagation();
            const idx = changeBtn.getAttribute('data-index');
            const targetInput = document.querySelector(`.image-input[data-index="${idx}"]`);
            if (targetInput) {
                targetInput.click();
            }
            return;
        }
    });

    function closePreviewModal() {
        if (previewModal) previewModal.style.display = 'none';
        if (fullSizePreviewTarget) fullSizePreviewTarget.src = '';
    }

    if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closePreviewModal);
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreviewModal();
        });
    }

    function clearAllErrors() {
        document.querySelectorAll('.error-msg').forEach(el => {
            el.innerText = '';
        });
    }

    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearAllErrors();

            const submitBtn = document.getElementById('saveProductBtn');
            const originalBtnText = submitBtn.innerHTML;

            const pName = document.getElementById('productName').value.trim();
            const pCat = document.getElementById('productCategory').value;
            const pDesc = document.getElementById('productDescription').value.trim();
            const pBrand = document.getElementById('productBrand').value.trim();
            const pMat = document.getElementById('productMaterial').value.trim();
            const pWarr = document.getElementById('productWarranty').value.trim();
            const pSpecs = document.getElementById('productSpecs').value.trim();

            const variantRows = document.querySelectorAll('.variant-row');
            const croppedCount = Object.keys(croppedFilesMap).length;

            const errorMessages = [];

            if (pName === '') {
                const msg = 'Product name is required.';
                document.getElementById('productNameError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pCat === '') {
                const msg = 'Please select a category.';
                document.getElementById('productCategoryError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pDesc === '') {
                const msg = 'Product description is required.';
                document.getElementById('productDescriptionError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pBrand === '') {
                const msg = 'Brand name is required.';
                document.getElementById('productBrandError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pMat === '') {
                const msg = 'Material type is required.';
                document.getElementById('productMaterialError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pWarr === '') {
                const msg = 'Warranty detail is required.';
                document.getElementById('productWarrantyError').innerText = msg;
                errorMessages.push(msg);
            }

            if (pSpecs === '') {
                const msg = 'Product specifications are required.';
                document.getElementById('productSpecsError').innerText = msg;
                errorMessages.push(msg);
            }

            if (croppedCount < 3) {
                const msg = 'All 3 images (Main Image, Side Image 1, and Side Image 2) must be selected and cropped.';
                document.getElementById('imagesError').innerText = msg;
                errorMessages.push(msg);
            }

            const variants = [];
            const variantNamesSet = new Set();
            const dimensionsSet = new Set();

            if (variantRows.length === 0) {
                const msg = 'At least one variant must be added.';
                document.getElementById('variantsContainerError').innerText = msg;
                errorMessages.push(msg);
            }

            variantRows.forEach((row, index) => {
                const variantNumber = index + 1;
                const vName = row.querySelector('.v-name').value.trim();
                const vPriceText = row.querySelector('.v-price').value.trim();
                const vDiscountText = row.querySelector('.v-discount').value.trim();
                const vStockText = row.querySelector('.v-stock').value.trim();
                const vLengthText = row.querySelector('.v-length').value.trim();
                const vWidthText = row.querySelector('.v-width').value.trim();
                const vHeightText = row.querySelector('.v-height').value.trim();

                const vPrice = parseFloat(vPriceText);
                const vDiscount = parseFloat(vDiscountText) || 0;
                const vStock = parseInt(vStockText, 10);
                const vLength = vLengthText !== '' ? parseFloat(vLengthText) : null;
                const vWidth = vWidthText !== '' ? parseFloat(vWidthText) : null;
                const vHeight = vHeightText !== '' ? parseFloat(vHeightText) : null;

                if (vName === '' || vPriceText === '' || vStockText === '') {
                    errorMessages.push(`Variant #${variantNumber} is missing required fields (Name, Price, or Stock).`);
                }

                if (vPriceText !== '' && (isNaN(vPrice) || vPrice < 0)) {
                    errorMessages.push(`Variant #${variantNumber} price cannot be negative.`);
                }

                if (vStockText !== '' && (isNaN(vStock) || vStock < 0)) {
                    errorMessages.push(`Variant #${variantNumber} stock cannot be negative.`);
                }

                if (vDiscountText !== '' && (isNaN(vDiscount) || vDiscount < 0 || vDiscount > 100)) {
                    errorMessages.push(`Variant #${variantNumber} discount must be between 0% and 100%.`);
                }

                if (vLength !== null && (isNaN(vLength) || vLength < 0)) {
                    errorMessages.push(`Variant #${variantNumber} length cannot be negative.`);
                }

                if (vWidth !== null && (isNaN(vWidth) || vWidth < 0)) {
                    errorMessages.push(`Variant #${variantNumber} width cannot be negative.`);
                }

                if (vHeight !== null && (isNaN(vHeight) || vHeight < 0)) {
                    errorMessages.push(`Variant #${variantNumber} height cannot be negative.`);
                }

                if (vName) {
                    const normalized = vName.toLowerCase();
                    if (variantNamesSet.has(normalized)) {
                        errorMessages.push(`Duplicate variant name: "${vName}". Each variant name must be unique.`);
                    } else {
                        variantNamesSet.add(normalized);
                    }
                }

                if (vLength !== null && vWidth !== null && vHeight !== null) {
                    const dimKey = `${vLength}x${vWidth}x${vHeight}`;
                    if (dimensionsSet.has(dimKey)) {
                        errorMessages.push(`Duplicate dimensions in Variant #${variantNumber} (${vLength}" × ${vWidth}" × ${vHeight}"). Length, width, and height cannot all be identical across variants.`);
                    } else {
                        dimensionsSet.add(dimKey);
                    }
                }

                variants.push({
                    variantName: vName,
                    originalPrice: vPrice,
                    discount: vDiscount,
                    stock: vStock,
                    length: vLength,
                    width: vWidth,
                    height: vHeight
                });
            });

            if (errorMessages.length > 0) {
                const formattedList = errorMessages.slice(0, 4).map(msg => `• ${msg}`).join('<br>');
                return Swal.fire({
                    icon: 'warning',
                    title: 'Validation Errors',
                    html: `<div class="text-center font-16">${formattedList}</div>`,
                    heightAuto: false,
                    confirmButtonColor: '#1a1a1a'
                });
            }

            const formData = new FormData();
            formData.append('name', pName);
            formData.append('categoryId', pCat);
            formData.append('description', pDesc);
            formData.append('brand', pBrand);
            formData.append('material', pMat);
            formData.append('warranty', pWarr);
            formData.append('specifications', pSpecs);
            formData.append('variants', JSON.stringify(variants));

            Object.keys(croppedFilesMap).forEach((idx) => {
                formData.append('images', croppedFilesMap[idx]);
            });

            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/admin/products', {
                    method: 'POST',
                    headers: {
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = '/admin/products';
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Validation Error',
                        text: data.message,
                        heightAuto: false,
                        confirmButtonColor: '#1a1a1a'
                    });
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error("Error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'System Error',
                    text: 'Could not connect to the server.',
                    heightAuto: false,
                    confirmButtonColor: '#1a1a1a'
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
            const primaryToken = document.getElementById("globalCsrfTokenField")?.value || "";

            try {
                const response = await fetch("/admin/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "csrf-token": primaryToken 
                    }
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
                        text: data.message || "Redirecting to login...",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = "/admin/login";
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Logout Failed",
                        text: data.message || "An error occurred.",
                        confirmButtonColor: "#222",
                        heightAuto: false
                    });
                }
            } catch (error) {
                window.location.href = "/admin/login";
            }
        });
    }
});