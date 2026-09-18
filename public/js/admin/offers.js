document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';

    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const dtElem = document.getElementById('datetimeDisplay');
        if (dtElem) dtElem.textContent = now.toLocaleDateString('en-IN', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.getElementById('closeSidebar');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => sidebar.classList.toggle('active'));
        if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    document.querySelectorAll('.modal-close-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    function clearFormErrors(formId) {
        document.querySelectorAll(`#${formId} .field-error-text`).forEach(el => el.textContent = '');
        document.querySelectorAll(`#${formId} .form-control`).forEach(el => el.classList.remove('input-error'));
    }

    const addNameInput = document.getElementById('addOfferName');
    const editNameInput = document.getElementById('editOfferName');
    if (addNameInput) addNameInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    if (editNameInput) editNameInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

    function syncTargetField(prefix) {
        const typeElem = document.getElementById(`${prefix}OfferType`);
        const labelElem = document.getElementById(`${prefix}OfferTargetLabel`);
        const targetElem = document.getElementById(`${prefix}OfferTarget`);

        if (typeElem.value === 'product') {
            labelElem.textContent = "Target Product ID (e.g. PRD-0001)";
            targetElem.placeholder = "e.g. PRD-0001";
        } else {
            labelElem.textContent = "Target Category Name";
            targetElem.placeholder = "e.g. Mattresses";
        }
    }

    const addOfferType = document.getElementById('addOfferType');
    if (addOfferType) addOfferType.addEventListener('change', () => syncTargetField('add'));

    const editOfferType = document.getElementById('editOfferType');
    if (editOfferType) editOfferType.addEventListener('change', () => syncTargetField('edit'));

    const openAddOfferModalBtn = document.getElementById('openAddOfferModalBtn');
    if (openAddOfferModalBtn) {
        openAddOfferModalBtn.addEventListener('click', () => {
            clearFormErrors('addOfferForm');
            document.getElementById('addOfferForm').reset();
            syncTargetField('add');
            openModal('addOfferModal');
        });
    }

    function validateOfferFields(prefix, isEdit = false) {
        let isValid = true;
        clearFormErrors(`${prefix}OfferForm`);

        const nameInput = document.getElementById(`${prefix}OfferName`);
        const discountInput = document.getElementById(`${prefix}OfferDiscount`);
        const targetInput = document.getElementById(`${prefix}OfferTarget`);
        const startInput = document.getElementById(`${prefix}StartDate`);
        const endInput = document.getElementById(`${prefix}EndDate`);

        const nameVal = nameInput.value.trim();
        const discountVal = Number(discountInput.value);
        const targetVal = targetInput.value.trim();
        const startVal = startInput.value;
        const endVal = endInput.value;

        if (!nameVal) {
            document.getElementById(`${prefix}OfferNameError`).textContent = 'Offer name is required.';
            nameInput.classList.add('input-error');
            isValid = false;
        }

        if (isNaN(discountVal) || discountVal < 1 || discountVal > 90) {
            document.getElementById(`${prefix}OfferDiscountError`).textContent = 'Discount must be between 1% and 90%.';
            discountInput.classList.add('input-error');
            isValid = false;
        }

        if (!targetVal) {
            document.getElementById(`${prefix}OfferTargetError`).textContent = 'Target is required.';
            targetInput.classList.add('input-error');
            isValid = false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!startVal) {
            document.getElementById(`${prefix}StartDateError`).textContent = 'Start date is required.';
            startInput.classList.add('input-error');
            isValid = false;
        } else if (!isEdit) {
            const startDateObj = new Date(startVal);
            startDateObj.setHours(0, 0, 0, 0);
            if (startDateObj < today) {
                document.getElementById(`${prefix}StartDateError`).textContent = 'Start date cannot be in the past.';
                startInput.classList.add('input-error');
                isValid = false;
            }
        }

        if (!endVal) {
            document.getElementById(`${prefix}EndDateError`).textContent = 'End date is required.';
            endInput.classList.add('input-error');
            isValid = false;
        } else if (startVal) {
            const startDateObj = new Date(startVal);
            const endDateObj = new Date(endVal);
            if (endDateObj <= startDateObj) {
                document.getElementById(`${prefix}EndDateError`).textContent = 'End date must be after start date.';
                endInput.classList.add('input-error');
                isValid = false;
            }
        }

        return isValid;
    }

    const addOfferForm = document.getElementById('addOfferForm');
    if (addOfferForm) {
        addOfferForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateOfferFields('add', false)) return;

            const submitBtn = document.getElementById('addOfferSubmitBtn');
            submitBtn.disabled = true;

            const payload = {
                name: document.getElementById('addOfferName').value.trim().toUpperCase(),
                offerType: document.getElementById('addOfferType').value,
                discount: Number(document.getElementById('addOfferDiscount').value),
                target: document.getElementById('addOfferTarget').value.trim(),
                startDate: document.getElementById('addStartDate').value,
                endDate: document.getElementById('addEndDate').value,
                status: document.getElementById('addOfferStatus').value
            };

            try {
                const response = await fetch('/admin/offers/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    closeModal('addOfferModal');
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Creation Failed',
                        text: data.message || 'Could not create offer.',
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.trigger-view-btn');
        if (!viewBtn) return;

        const d = viewBtn.dataset;
        document.getElementById('viewOfferName').textContent = d.name;
        document.getElementById('viewOfferType').textContent = d.type;
        document.getElementById('viewOfferTarget').textContent = d.target;
        document.getElementById('viewOfferDiscount').textContent = `${d.discount}% OFF`;
        document.getElementById('viewOfferStartDate').textContent = d.start;
        document.getElementById('viewOfferEndDate').textContent = d.end;

        const statusBadge = d.status === 'active'
            ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Active</span>`
            : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Inactive</span>`;
        document.getElementById('viewOfferStatus').innerHTML = statusBadge;

        openModal('viewOfferModal');
    });

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.trigger-edit-btn');
        if (!editBtn) return;

        clearFormErrors('editOfferForm');
        const d = editBtn.dataset;

        document.getElementById('editOfferId').value = d.id;
        document.getElementById('editOfferName').value = d.name;
        document.getElementById('editOfferType').value = d.type;
        document.getElementById('editOfferDiscount').value = d.discount;
        document.getElementById('editOfferTarget').value = d.target;
        document.getElementById('editStartDate').value = d.start;
        document.getElementById('editEndDate').value = d.end;
        document.getElementById('editOfferStatus').value = d.status;

        syncTargetField('edit');
        openModal('editOfferModal');
    });

    const editOfferForm = document.getElementById('editOfferForm');
    if (editOfferForm) {
        editOfferForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateOfferFields('edit', true)) return;

            const offerId = document.getElementById('editOfferId').value;
            const submitBtn = document.getElementById('editOfferSubmitBtn');
            submitBtn.disabled = true;

            const payload = {
                name: document.getElementById('editOfferName').value.trim().toUpperCase(),
                offerType: document.getElementById('editOfferType').value,
                discount: Number(document.getElementById('editOfferDiscount').value),
                target: document.getElementById('editOfferTarget').value.trim(),
                startDate: document.getElementById('editStartDate').value,
                endDate: document.getElementById('editEndDate').value,
                status: document.getElementById('editOfferStatus').value
            };

            try {
                const response = await fetch(`/admin/offers/edit/${offerId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.success) {
                    closeModal('editOfferModal');
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: data.message || 'Could not update offer.',
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.trigger-toggle-status-btn');
        if (!toggleBtn) return;

        const { id, name, status } = toggleBtn.dataset;
        const willBlock = status === 'active';
        const actionWord = willBlock ? 'block' : 'unblock';

        Swal.fire({
            icon: 'warning',
            title: `Confirm ${actionWord.toUpperCase()}`,
            text: `Are you sure you want to ${actionWord} offer "${name}"?`,
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionWord}`,
            cancelButtonText: 'Cancel',
            confirmButtonColor: willBlock ? '#d93025' : '#1e8e3e',
            cancelButtonColor: '#757575',
            heightAuto: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/offers/toggle-status/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken,
                            'x-csrf-token': csrfToken
                        }
                    });

                    const data = await response.json();

                    if (data.success) {
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
                            title: 'Failed',
                            text: data.message || 'Could not toggle status.',
                            confirmButtonColor: '#1a1a1a',
                            heightAuto: false
                        });
                    }
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Unable to reach the server.',
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            }
        });
    });

    function executeFilter() {
        const searchVal = document.getElementById('offerSearchInput')?.value.trim() || '';
        const typeVal = document.getElementById('typeFilterSelect')?.value || 'all';
        const statusVal = document.getElementById('statusFilterSelect')?.value || 'all';

        const params = new URLSearchParams();
        if (searchVal) params.append('search', searchVal);
        if (typeVal !== 'all') params.append('type', typeVal);
        if (statusVal !== 'all') params.append('status', statusVal);
        params.append('page', '1');

        window.location.href = `/admin/offers?${params.toString()}`;
    }

    const typeFilterSelect = document.getElementById('typeFilterSelect');
    const statusFilterSelect = document.getElementById('statusFilterSelect');
    if (typeFilterSelect) typeFilterSelect.addEventListener('change', executeFilter);
    if (statusFilterSelect) statusFilterSelect.addEventListener('change', executeFilter);

    const searchInput = document.getElementById('offerSearchInput');
    const searchActionBtn = document.getElementById('searchActionBtn');

    if (searchActionBtn && searchInput) {
        searchActionBtn.addEventListener('click', () => {
            if (searchActionBtn.classList.contains('is-clear')) {
                searchInput.value = '';
            }
            executeFilter();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeFilter();
            }
        });
    }

    const adminLogoutForm = document.getElementById('adminLogoutForm');
    if (adminLogoutForm) {
        adminLogoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                const response = await fetch('/admin/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    }
                });

                if (response.redirected) {
                    window.location.href = response.url;
                    return;
                }

                const data = await response.json();
                if (data.success || response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Logged Out',
                        text: data.message || 'Redirecting...',
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = '/admin/login';
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Logout Failed',
                        text: data.message || 'An error occurred.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (error) {
                window.location.href = '/admin/login';
            }
        });
    }
});