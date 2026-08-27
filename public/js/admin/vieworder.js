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

    const dropdownWrapper = document.getElementById('mainStatusWrapper');
    if (dropdownWrapper) {
        dropdownWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownWrapper.classList.toggle('open');
        });

        document.querySelectorAll('.custom-select-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                const textElem = document.getElementById('mainStatusText');
                if (textElem) textElem.textContent = option.textContent.trim();

                const inputElem = document.getElementById('mainStatusInput');
                if (inputElem) inputElem.value = option.dataset.value;

                dropdownWrapper.classList.remove('open');
            });
        });

        window.addEventListener('click', () => {
            dropdownWrapper.classList.remove('open');
        });
    }

    const updateModal = document.getElementById('updateStatusModal');
    const openModalBtn = document.getElementById('openStatusModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');

    function openModal() {
        if (updateModal) updateModal.style.display = 'flex';
    }

    function closeModal() {
        if (updateModal) updateModal.style.display = 'none';
    }

    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === updateModal) closeModal();
    });

    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const orderId = document.getElementById('modalOrderId')?.value;
            const status = document.getElementById('mainStatusInput')?.value;
            const saveBtn = document.getElementById('saveStatusBtn');

            if (!orderId || !status) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Incomplete Field',
                    text: 'Please choose an order status.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

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
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Status Updated',
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

    const adminLogoutForm = document.getElementById("adminLogoutForm");
    if (adminLogoutForm) {
        adminLogoutForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            try {
                const response = await fetch("/admin/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "csrf-token": csrfToken
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
                        text: data.message || "Redirecting to authentication login window...",
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
                        text: data.message || "An unexpected issue occurred.",
                        confirmButtonColor: "#222",
                        heightAuto: false
                    });
                }
            } catch (error) {
                window.location.href = "/admin/login";
            }
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