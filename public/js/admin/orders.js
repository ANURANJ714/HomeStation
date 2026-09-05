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

            const textElem = wrapper.querySelector('.custom-select-trigger span');
            if (textElem) textElem.textContent = option.textContent.trim();

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
                        text: data.message || "Redirecting...",
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

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.getElementById('closeSidebar');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => sidebar.classList.toggle('active'));
        if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));
    }
});