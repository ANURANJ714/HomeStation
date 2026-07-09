document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken').value;

    function updateDateTime() {
        const display = document.getElementById('datetimeDisplay');
        if (!display) return;
        
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        display.textContent = now.toLocaleDateString('en-IN', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) {
            const modalId = closeBtn.getAttribute('data-close');
            closeModal(modalId);
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.style.display = 'none';
        }
    });

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (appSidebar) appSidebar.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    const openAddModalBtn = document.getElementById('openAddModalBtn');
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => openModal('addCategoryModal'));
    }

    const sortDropdown = document.getElementById('sortDropdown');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', function () {
            window.location.href = '/admin/categories?page=1&sort=' + this.value;
        });
    }

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.action-edit');
        if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            const name = decodeURIComponent(editBtn.getAttribute('data-name'));

            document.getElementById('editCategoryId').value = id;
            const nameInput = document.getElementById('editCategoryNameInput');
            nameInput.value = name;
            nameInput.dataset.originalName = name;
            document.getElementById('editCategoryImage').value = '';

            openModal('editCategoryModal');
        }

        const toggleBtn = e.target.closest('.action-toggle');
        if (toggleBtn) {
            const id = toggleBtn.getAttribute('data-id');
            const name = decodeURIComponent(toggleBtn.getAttribute('data-name'));
            const action = toggleBtn.getAttribute('data-action');

            const title = document.getElementById('confirmTitle');
            const msg = document.getElementById('confirmMessage');
            const cBtn = document.getElementById('confirmBtn');

            if (action === 'delete') {
                title.textContent = 'Delete Category';
                msg.textContent = `Are you sure you want to delete "${name}"?`;
                cBtn.textContent = 'Delete';
                cBtn.className = 'btn btn-danger-light';
            } else {
                title.textContent = 'Restore Category';
                msg.textContent = `Are you sure you want to restore "${name}"?`;
                cBtn.textContent = 'Restore';
                cBtn.className = 'btn btn-success';
            }

            cBtn.onclick = () => executeToggle(action, id);
            openModal('confirmModal');
        }
    });

    async function executeToggle(action, id) {
        const confirmBtn = document.getElementById('confirmBtn');
        const originalBtnText = confirmBtn.textContent;

        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;

        try {
            let url = `/admin/categories/${id}`;
            let method = action === 'delete' ? 'DELETE' : 'PATCH';
            if (action === 'restore') url += '/restore';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
            });

            const data = await response.json();

            if (data.success) {
                closeModal('confirmModal');
                Swal.fire({
                    icon: 'success',
                    title: action === 'delete' ? 'Deleted!' : 'Restored!',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false,
                    heightAuto: false
                }).then(() => window.location.reload());
            } else {
                Swal.fire({ icon: 'error', title: 'Action Failed', text: data.message, heightAuto: false });
            }
        } catch (error) {
            console.error("Fetch error:", error);
            Swal.fire({ icon: 'error', title: 'System Error', text: 'Could not connect to the server.', heightAuto: false });
        } finally {
            confirmBtn.textContent = originalBtnText;
            confirmBtn.disabled = false;
        }
    }

    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = document.getElementById('addBtn');
            const nameInput = document.getElementById('categoryName').value.trim();
            const imageInput = document.getElementById('categoryImage').files[0];

            if (!nameInput) return Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please enter a category name.', heightAuto: false });
            if (!imageInput) return Swal.fire({ icon: 'warning', title: 'Missing Image', text: 'Please upload an image for the category.', heightAuto: false });

            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
            if (!validTypes.includes(imageInput.type)) return Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Only JPG, PNG, and WEBP images are allowed.', heightAuto: false });

            const formData = new FormData(this);
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/admin/categories', {
                    method: 'POST',
                    headers: { 'CSRF-Token': csrfToken },
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    closeModal('addCategoryModal');
                    Swal.fire({ icon: 'success', title: 'Success!', text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false }).then(() => window.location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Action Failed', text: data.message, heightAuto: false });
                    submitBtn.textContent = 'Add Category';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error("Fetch error:", error);
                Swal.fire({ icon: 'error', title: 'System Error', text: 'Could not connect to the server.', heightAuto: false });
                submitBtn.textContent = 'Add Category';
                submitBtn.disabled = false;
            }
        });
    }

    const editCategoryForm = document.getElementById('editCategoryForm');
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const categoryId = document.getElementById('editCategoryId').value;
            const nameInputElement = document.getElementById('editCategoryNameInput');
            const nameInput = nameInputElement.value.trim();
            const originalName = nameInputElement.dataset.originalName;
            const imageInput = document.getElementById('editCategoryImage').files[0];
            const submitBtn = document.getElementById('editBtn');

            if (!nameInput) return Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Category name cannot be empty.', heightAuto: false });

            if (nameInput === originalName && !imageInput) {
                return Swal.fire({ icon: 'info', title: 'No Changes', text: 'You have not made any changes to the category name or image.', confirmButtonColor: '#1a1a1a', heightAuto: false });
            }

            if (imageInput) {
                const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
                if (!validTypes.includes(imageInput.type)) return Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Only JPG, PNG, and WEBP images are allowed.', heightAuto: false });
            }

            const formData = new FormData(this);
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`/admin/categories/${categoryId}`, {
                    method: 'PATCH',
                    headers: { 'CSRF-Token': csrfToken },
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    closeModal('editCategoryModal');
                    Swal.fire({ icon: 'success', title: 'Updated!', text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false }).then(() => window.location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Update Failed', text: data.message, heightAuto: false });
                    submitBtn.textContent = 'Save';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error("Fetch error:", error);
                Swal.fire({ icon: 'error', title: 'System Error', text: 'Could not connect to the server.', heightAuto: false });
                submitBtn.textContent = 'Save';
                submitBtn.disabled = false;
            }
        });
    }
});