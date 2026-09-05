document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const pageOrderId = document.getElementById('pageOrderId')?.value || '';
    const pageOrderItemId = document.getElementById('pageOrderItemId')?.value || '';

    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const timeElem = document.getElementById('datetimeDisplay');
        if (timeElem) timeElem.textContent = now.toLocaleDateString('en-IN', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

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

            const inputElem = wrapper.querySelector('input[type="hidden"]');
            if (inputElem) inputElem.value = option.dataset.value;

            wrapper.classList.remove('open');
            return;
        }

        if (!e.target.closest('.custom-select-wrapper')) {
            closeAllDropdowns();
        }
    });

    const updateModal = document.getElementById('updateStatusModal');
    const openStatusModalBtn = document.getElementById('openStatusModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const modalTitleText = document.getElementById('modalTitleText');
    const modalLabelText = document.getElementById('modalLabelText');
    const modalStatusOptionsList = document.getElementById('modalStatusOptionsList');
    const mainStatusText = document.getElementById('mainStatusText');
    const mainStatusInput = document.getElementById('mainStatusInput');

    const deliveryStages = [
        { label: 'Processing', value: 'processing' },
        { label: 'Packed', value: 'packed' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'On the Way', value: 'on the way' },
        { label: 'Out for Delivery', value: 'out for delivery' },
        { label: 'Delivered', value: 'delivered' }
    ];

    const returnStages = [
        { label: 'Return Initiated', value: 'return initiated' },
        { label: 'Pickup Assigned', value: 'pickup assigned' },
        { label: 'Item Picked Up', value: 'item picked up' },
        { label: 'In Transit', value: 'in transit' },
        { label: 'Item Reached', value: 'item reached' }
    ];

    function openModal() {
        if (!openStatusModalBtn) return;
        const isReturn = openStatusModalBtn.dataset.isReturn === 'true';
        const currentStatus = openStatusModalBtn.dataset.currentStatus || 'processing';

        modalTitleText.textContent = isReturn ? 'Update Return Stage' : 'Update Item Status';
        modalLabelText.textContent = isReturn ? 'Return Stage' : 'Delivery Status';

        const stages = isReturn ? returnStages : deliveryStages;
        modalStatusOptionsList.innerHTML = '';

        stages.forEach(stage => {
            const li = document.createElement('li');
            li.className = `custom-select-option ${stage.value === currentStatus ? 'selected' : ''}`;
            li.dataset.value = stage.value;
            li.textContent = stage.label;
            modalStatusOptionsList.appendChild(li);
        });

        const selectedStage = stages.find(s => s.value === currentStatus) || stages[0];
        mainStatusText.textContent = selectedStage.label;
        mainStatusInput.value = selectedStage.value;

        updateModal.style.display = 'flex';
    }

    function closeModal() {
        if (updateModal) updateModal.style.display = 'none';
    }

    if (openStatusModalBtn) openStatusModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === updateModal) closeModal();
    });

    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const orderId = document.getElementById('modalOrderId')?.value || pageOrderId;
            const orderItemId = document.getElementById('modalOrderItemId')?.value || pageOrderItemId;
            const status = mainStatusInput?.value;
            const saveBtn = document.getElementById('saveStatusBtn');

            if (!orderId || !orderItemId || !status) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Incomplete Field',
                    text: 'Please select a status.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const response = await fetch('/admin/orders/status', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ orderId, orderItemId, status })
                });

                const data = await response.json();

                if (data.isUnchanged) {
                    closeModal();
                    Swal.fire({
                        icon: 'info',
                        title: 'No Change',
                        text: data.message || 'No change made in status.',
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                } else if (data.success) {
                    closeModal();
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
                saveBtn.textContent = 'Save Status';
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