document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken').value;
    
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
        row.className = 'variant-row new-created-variant';
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
        if (!removeBtn) return;

        const targetRow = removeBtn.closest('.variant-row');
        
        if (targetRow && targetRow.classList.contains('new-created-variant')) {
            targetRow.remove();
        } else {
            Swal.fire({ 
                icon: 'error', 
                title: 'Action Prohibited', 
                text: 'Pre-existing base product variants cannot be deleted from this view.', 
                heightAuto: false, 
                confirmButtonColor: '#1a1a1a' 
            });
        }
    });

    window.previewImage = function(input) {
        const box = input.closest('.upload-box');
        const img = box.querySelector('.preview-img');
        const placeholder = box.querySelector('.upload-placeholder');
        
        if (input.files && input.files[0]) {
            const objectUrl = URL.createObjectURL(input.files[0]);
            img.src = objectUrl;
            img.classList.remove('hidden');
            img.classList.add('show-block');
            placeholder.classList.remove('show-flex');
            placeholder.classList.add('hidden');
            box.classList.add('has-image');
        } else {
            img.src = '';
            img.classList.remove('show-block');
            img.classList.add('hidden');
            placeholder.classList.remove('hidden');
            placeholder.classList.add('show-flex');
            box.classList.remove('has-image');
        }
    };

    document.querySelectorAll('.image-input').forEach(input => {
        input.addEventListener('change', function() {
            window.previewImage(this);
        });
    });

    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const form = this;
            const productId = form.getAttribute('data-product-id');
            const submitBtn = document.getElementById('saveProductBtn');
            const originalBtnText = submitBtn.innerHTML;

            const pName = document.getElementById('productName').value.trim();
            const pCat = document.getElementById('productCategory').value;
            const pDesc = document.getElementById('productDescription').value.trim();
            const pBrand = document.getElementById('productBrand').value.trim();
            const pMat = document.getElementById('productMaterial').value.trim();
            const pWarr = document.getElementById('productWarranty').value.trim();
            const pSpecs = document.getElementById('productSpecs').value.trim();

            if (!pName || !pCat || !pDesc || !pBrand || !pMat || !pWarr || !pSpecs) {
                return Swal.fire({ 
                    icon: 'warning', 
                    title: 'Fields Required', 
                    text: 'Please fill out all the mandatory fields before saving.', 
                    heightAuto: false, 
                    confirmButtonColor: '#1a1a1a' 
                });
            }

            const formData = new FormData(form);
            const variantRows = document.querySelectorAll('.variant-row');
            const variants = [];
            let isVariantsValid = true;

            variantRows.forEach(row => {
                const vName = row.querySelector('.v-name').value.trim();
                const vPriceText = row.querySelector('.v-price').value.trim();
                const vStockText = row.querySelector('.v-stock').value.trim();

                const vPrice = parseFloat(vPriceText);
                const vDiscount = parseFloat(row.querySelector('.v-discount').value) || 0;
                const vStock = parseInt(vStockText);
                const vLength = parseFloat(row.querySelector('.v-length').value) || null;
                const vWidth = parseFloat(row.querySelector('.v-width').value) || null;
                const vHeight = parseFloat(row.querySelector('.v-height').value) || null;

                if (!vName || vPriceText === '' || vStockText === '' || isNaN(vPrice) || isNaN(vStock) || vPrice < 0 || vStock < 0) {
                    isVariantsValid = false;
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

            if (!isVariantsValid) {
                return Swal.fire({ 
                    icon: 'warning', 
                    title: 'Invalid Variants', 
                    text: 'All variants must have a Name, valid Price, and Stock allocation.', 
                    heightAuto: false, 
                    confirmButtonColor: '#1a1a1a' 
                });
            }

            formData.append('variants', JSON.stringify(variants));
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`/admin/products/${productId}`, {
                    method: 'PATCH',
                    headers: {
                        'CSRF-Token': csrfToken
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success', 
                        title: 'Updated!', 
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
                        title: 'Error', 
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
                      text: data.message || "Redirecting to login window...",
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