document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';

    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const timeElem = document.getElementById('datetimeDisplay');
        if (timeElem) timeElem.textContent = now.toLocaleDateString('en-IN', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const searchInput = document.getElementById('searchOrderInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchBox = searchInput ? searchInput.closest('.search-box') : null;

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (this.value.trim().length > 0) {
                searchBox?.classList.add('has-value');
            } else {
                searchBox?.classList.remove('has-value');
            }
        });

        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                const currentStatus = document.getElementById('filterStatusInput')?.value || '';
                window.location.href = `/admin/orders?page=1&search=${encodeURIComponent(query)}&status=${currentStatus}`;
            }
        });
    }

    if (searchClearBtn && searchInput) {
        searchClearBtn.addEventListener('click', function () {
            searchInput.value = '';
            searchBox?.classList.remove('has-value');
            const currentStatus = document.getElementById('filterStatusInput')?.value || '';
            window.location.href = `/admin/orders?page=1&search=&status=${currentStatus}`;
        });
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.custom-select-trigger');
        if (trigger) {
            const wrapper = trigger.closest('.custom-select-wrapper');
            const isOpen = wrapper.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) wrapper.classList.add('open');
            return;
        }

        const option = e.target.closest('.custom-select-option');
        if (option) {
            const wrapper = option.closest('.custom-select-wrapper');
            wrapper.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            const textDisplay = wrapper.querySelector('.custom-select-trigger span');
            if (textDisplay) textDisplay.textContent = option.textContent.trim();

            const hiddenInput = wrapper.querySelector('input[type="hidden"]');
            if (hiddenInput) hiddenInput.value = option.dataset.value;

            wrapper.classList.remove('open');

            if (wrapper.id === 'filterStatusSelectWrapper') {
                const query = searchInput ? searchInput.value.trim() : '';
                window.location.href = `/admin/orders?page=1&search=${encodeURIComponent(query)}&status=${option.dataset.value}`;
            }
            return;
        }

        if (!e.target.closest('.custom-select-wrapper')) {
            closeAllDropdowns();
        }
    });

    const updateModal = document.getElementById('updateStatusModal');
    const modalOrderId = document.getElementById('modalOrderId');
    const modalStatusText = document.getElementById('modalStatusText');
    const modalStatusInput = document.getElementById('modalStatusInput');
    const updateStatusForm = document.getElementById('updateStatusForm');

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.trigger-update-modal-btn');
        if (!editBtn) return;

        const orderId = editBtn.dataset.orderId;
        const currentStatus = editBtn.dataset.status || 'processing';

        modalOrderId.value = orderId;
        modalStatusInput.value = currentStatus;

        const matchingOption = updateModal.querySelector(`.custom-select-option[data-value="${currentStatus}"]`);
        if (matchingOption) {
            updateModal.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
            matchingOption.classList.add('selected');
            modalStatusText.textContent = matchingOption.textContent.trim();
        }

        updateModal.style.display = 'flex';
    });

    function closeStatusModal() {
        if (updateModal) updateModal.style.display = 'none';
    }

    document.getElementById('closeUpdateModalBtn')?.addEventListener('click', closeStatusModal);
    document.getElementById('cancelUpdateModalBtn')?.addEventListener('click', closeStatusModal);

    window.addEventListener('click', (e) => {
        if (e.target === updateModal) closeStatusModal();
    });

    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const orderId = modalOrderId.value;
            const status = modalStatusInput.value;

            const saveBtn = document.getElementById('saveStatusBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Updating...';

            try {
                const response = await fetch('/admin/orders/status', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ orderId, status })
                });

                const data = await response.json();

                if (data.success) {
                    closeStatusModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: data.message || 'Could not update status.',
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Update Status';
            }
        });
    }

    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Sign Out',
                text: 'Are you sure you want to sign out of the Admin panel?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#1a1a1a',
                cancelButtonColor: '#777',
                confirmButtonText: 'Yes, Sign Out',
                heightAuto: false
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await fetch('/admin/logout', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken,
                                'x-csrf-token': csrfToken
                            }
                        });
                        const data = await response.json();
                        if (data.success && data.redirectUrl) {
                            window.location.href = data.redirectUrl;
                        } else {
                            window.location.href = '/admin/login';
                        }
                    } catch {
                        window.location.href = '/admin/login';
                    }
                }
            });
        });
    }

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.getElementById('closeSidebar');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => sidebar.classList.toggle('active'));
        if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));
    }
});