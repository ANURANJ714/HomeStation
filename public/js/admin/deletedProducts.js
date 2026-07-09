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

    const hamburgerBtn = document.getElementById('hamburgerMenu');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const appSidebar = document.getElementById('appSidebar') || document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openSidebarLayout() {
        if (appSidebar) appSidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function closeSidebarLayout() {
        if (appSidebar) appSidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebarLayout);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebarLayout);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarLayout);

    const logoutBtn = document.getElementById('logoutButton');
    const logoutForm = document.getElementById('adminLogoutForm');
    if (logoutBtn && logoutForm) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutForm.submit();
        });
    }

    const restoreModal = document.getElementById('restoreModal');
    const restoreMessage = document.getElementById('restoreMessage');
    const confirmBtn = document.getElementById('confirmRestoreBtn');
    const cancelBtn = document.getElementById('cancelRestoreBtn');
    const csrfInputElement = document.getElementById('csrfToken');
    
    let productIdToRestore = null;

    document.addEventListener('click', (e) => {
        const restoreBtn = e.target.closest('.btn-restore');
        if (restoreBtn) {
            productIdToRestore = restoreBtn.getAttribute('data-id');
            const name = restoreBtn.getAttribute('data-name');
            
            restoreMessage.textContent = `Are you sure you want to restore "${name}"? It will be moved back to the active products list.`;
            
            if (restoreModal) {
                restoreModal.classList.add('active');
            }
        }
    });

    const closeModal = () => {
        if (restoreModal) {
            restoreModal.classList.remove('active');
        }
        productIdToRestore = null;
    };

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (restoreModal) {
        restoreModal.addEventListener('click', (e) => {
            if (e.target === restoreModal) closeModal();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!productIdToRestore) return;
            
            const idToRestore = productIdToRestore; 
            const csrfToken = csrfInputElement ? csrfInputElement.value : '';
            closeModal(); 

            try {
                const response = await fetch(`/admin/products/${idToRestore}/restore`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    }
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Restored!',
                        text: data.message,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: data.title || 'Error',
                        text: data.message,
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Restore error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'System Error',
                    text: 'Could not connect to server.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }
        });
    }
});