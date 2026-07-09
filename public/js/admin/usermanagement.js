document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value;
    let pendingUserId = null;
    let pendingAction = null;

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

    async function executeStatusChange() {
        closeModal(pendingAction === 'Block' ? 'blockUserModal' : 'unblockUserModal');
        try {
            const response = await fetch(`/admin/users/${pendingUserId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
            });
            const data = await response.json();

            if (data.success) {
                const row = document.getElementById(`user-row-${pendingUserId}`);
                if (row) {
                    const statusCell = row.querySelector('.status-cell');
                    const actionsCell = row.querySelector('.actions-td');
                    if (pendingAction === 'Block') {
                        row.classList.add('blocked-row');
                        statusCell.innerHTML = '<span class="badge badge-danger">Blocked</span>';
                        actionsCell.innerHTML = `<button class="btn-action btn-unblock action-status" data-id="${pendingUserId}" data-action="Unblock"><i class="fa-solid fa-unlock"></i> Unblock</button>`;
                    } else {
                        row.classList.remove('blocked-row');
                        statusCell.innerHTML = '<span class="badge badge-success">Active</span>';
                        actionsCell.innerHTML = `<button class="btn-action btn-block action-status" data-id="${pendingUserId}" data-action="Block"><i class="fa-solid fa-ban"></i> Block</button>`;
                    }
                }
                const activeElement = document.getElementById('activeUsersCount');
                const blockedElement = document.getElementById('blockedUsersCount');
                let activeCount = parseInt(activeElement.innerText.replace(/,/g, '')) || 0;
                let blockedCount = parseInt(blockedElement.innerText.replace(/,/g, '')) || 0;

                if (pendingAction === 'Block') {
                    activeCount = Math.max(0, activeCount - 1);
                    blockedCount++;
                } else {
                    activeCount++;
                    blockedCount = Math.max(0, blockedCount - 1);
                }
                activeElement.innerText = activeCount;
                blockedElement.innerText = blockedCount;

                Swal.fire({ icon: 'success', title: pendingAction === 'Block' ? 'User Blocked' : 'User Unblocked', text: data.message, timer: 2000, showConfirmButton: false, heightAuto: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Action Failed', text: data.message, heightAuto: false });
            }
        } catch (error) {
            console.error("Error:", error);
            Swal.fire({ icon: 'error', title: 'System Error', text: 'Something went wrong.', heightAuto: false });
        }
    }

    const filterDropdowns = document.querySelectorAll('.filters-container .filter-select');
    filterDropdowns.forEach(dropdown => {
        dropdown.addEventListener('change', function () {
            this.closest('form').submit();
        });
    });

    document.getElementById('openAddUserModal')?.addEventListener('click', () => {
        openModal('addUserModal');
    });

    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) {
            const modalId = closeBtn.getAttribute('data-close');
            closeModal(modalId);
        }
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-password');
        if (toggleBtn) {
            const inputId = toggleBtn.getAttribute('data-target');
            const passwordInput = document.getElementById(inputId);
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleBtn.classList.remove("fa-eye-slash");
                toggleBtn.classList.add("fa-eye");
            } else {
                passwordInput.type = "password";
                toggleBtn.classList.remove("fa-eye");
                toggleBtn.classList.add("fa-eye-slash");
            }
        }
    });

    document.addEventListener('click', (e) => {
        const statusBtn = e.target.closest('.action-status');
        if (statusBtn) {
            pendingUserId = statusBtn.getAttribute('data-id');
            pendingAction = statusBtn.getAttribute('data-action');
            pendingAction === 'Block' ? openModal('blockUserModal') : openModal('unblockUserModal');
        }
    });

    document.getElementById('confirmBlockBtn')?.addEventListener('click', executeStatusChange);
    document.getElementById('confirmUnblockBtn')?.addEventListener('click', executeStatusChange);

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('addFullName').value.trim();
            const email = document.getElementById('addEmail').value.trim();
            const phone = document.getElementById('addPhone').value.trim();
            const password = document.getElementById('addPassword').value;
            const confirmPassword = document.getElementById('addConfirmPassword').value;

            if (!fullName || !email || !phone || !password || !confirmPassword) {
                return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'All fields are required.', heightAuto: false });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return Swal.fire({ icon: 'warning', title: 'Invalid Email', text: 'Please enter a valid email format.', heightAuto: false });

            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone)) return Swal.fire({ icon: 'warning', title: 'Invalid Phone', text: 'Please enter a valid 10-digit phone number.', heightAuto: false });

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
            if (!passwordRegex.test(password)) return Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'Password must be at least 12 characters and include uppercase, lowercase, number, and special character.', heightAuto: false });

            if (password !== confirmPassword) return Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'Passwords do not match.', heightAuto: false });

            try {
                const response = await fetch('/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify({ fullName, email, phone, password, confirmPassword })
                });
                const data = await response.json();

                if (data.success) {
                    closeModal('addUserModal');
                    this.reset();
                    Swal.fire({ icon: 'success', title: 'Success!', text: data.message, timer: 2000, showConfirmButton: false, heightAuto: false }).then(() => window.location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Creation Failed', text: data.message, heightAuto: false });
                }
            } catch (error) {
                console.error("Error:", error);
                Swal.fire({ icon: 'error', title: 'System Error', text: 'Could not connect to the server.', heightAuto: false });
            }
        });
    }

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
});