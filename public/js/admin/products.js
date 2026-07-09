document.addEventListener('DOMContentLoaded', () => {
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

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function () {
            this.closest('form').submit();
        });
    }

    const deleteModal = document.getElementById('deleteProductModal');
    const deleteMessage = document.getElementById('deleteMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const csrfInputElement = document.getElementById('csrfToken');

    let productIdToDelete = null;

    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-icon.delete');
        if (deleteBtn) {
            productIdToDelete = deleteBtn.getAttribute('data-id');
            const name = decodeURIComponent(deleteBtn.getAttribute('data-name'));

            deleteMessage.textContent = `Are you sure you want to delete "${name}"?`;
            deleteModal.style.display = 'flex';
        }
    });

    const closeModal = () => {
        if (deleteModal) deleteModal.style.display = 'none';
        productIdToDelete = null;
    };

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!productIdToDelete) return;

            const csrfToken = csrfInputElement ? csrfInputElement.value : '';
            deleteModal.style.display = 'none';

            try {
                const response = await fetch(`/admin/products/${productIdToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    }
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: data.message,
                        showConfirmButton: false,
                        heightAuto: false,
                        timer: 1500
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message,
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Delete error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'System Error',
                    text: 'Could not connect to the server.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }
        });
    }
});