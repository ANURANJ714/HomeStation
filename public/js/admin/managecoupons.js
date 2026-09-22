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

    const addCodeInput = document.getElementById('addCouponCode');
    const editCodeInput = document.getElementById('editCouponCode');
    if (addCodeInput) addCodeInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    if (editCodeInput) editCodeInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

    function handleDiscountTypeChange(prefix) {
        const typeSelect = document.getElementById(`${prefix}DiscountType`);
        const maxRedeemGroup = document.getElementById(`${prefix}MaxRedeemGroup`);
        const discountLabel = document.getElementById(`${prefix}DiscountValueLabel`);
        const discountInput = document.getElementById(`${prefix}DiscountValue`);

        if (typeSelect.value === 'percentage') {
            maxRedeemGroup.classList.remove('d-none');
            discountLabel.textContent = 'Discount Value (%)';
            discountInput.placeholder = '1 - 90';
        } else {
            maxRedeemGroup.classList.add('d-none');
            discountLabel.textContent = 'Discount Value (₹)';
            discountInput.placeholder = '100 - 10000';
            document.getElementById(`${prefix}MaxPurchase`).value = '';
            document.getElementById(`${prefix}MaxPurchaseError`).textContent = '';
        }
    }

    const addDiscountType = document.getElementById('addDiscountType');
    if (addDiscountType) {
        addDiscountType.addEventListener('change', () => handleDiscountTypeChange('add'));
    }

    const editDiscountType = document.getElementById('editDiscountType');
    if (editDiscountType) {
        editDiscountType.addEventListener('change', () => handleDiscountTypeChange('edit'));
    }

    const openAddCouponModalBtn = document.getElementById('openAddCouponModalBtn');
    if (openAddCouponModalBtn) {
        openAddCouponModalBtn.addEventListener('click', () => {
            clearFormErrors('addCouponForm');
            document.getElementById('addCouponForm').reset();
            handleDiscountTypeChange('add');
            openModal('addCouponModal');
        });
    }

    function validateCouponFields(prefix) {
        let isValid = true;
        clearFormErrors(`${prefix}CouponForm`);

        const codeInput = document.getElementById(`${prefix}CouponCode`);
        const typeInput = document.getElementById(`${prefix}DiscountType`);
        const discountInput = document.getElementById(`${prefix}DiscountValue`);
        const minPurchaseInput = document.getElementById(`${prefix}MinPurchase`);
        const maxPurchaseInput = document.getElementById(`${prefix}MaxPurchase`);
        const maxUsesInput = document.getElementById(`${prefix}MaxUses`);
        const validUntilInput = document.getElementById(`${prefix}ValidUntil`);

        const codeVal = codeInput.value.trim().toUpperCase();
        const typeVal = typeInput.value;
        const discountVal = Number(discountInput.value);
        const minPurchaseVal = Number(minPurchaseInput.value);
        const maxUsesVal = Number(maxUsesInput.value);
        const validUntilVal = validUntilInput.value;

        if (!codeVal) {
            document.getElementById(`${prefix}CouponCodeError`).textContent = 'Coupon code is required.';
            codeInput.classList.add('input-error');
            isValid = false;
        }

        if (typeVal === 'percentage') {
            if (isNaN(discountVal) || discountVal < 1 || discountVal > 90) {
                document.getElementById(`${prefix}DiscountValueError`).textContent = 'Discount must be between 1% and 90%.';
                discountInput.classList.add('input-error');
                isValid = false;
            }

            const maxPurchaseVal = Number(maxPurchaseInput.value);
            if (isNaN(maxPurchaseVal) || maxPurchaseVal <= 0) {
                document.getElementById(`${prefix}MaxPurchaseError`).textContent = 'Maximum redeem amount must be greater than 0.';
                maxPurchaseInput.classList.add('input-error');
                isValid = false;
            }
        } else {
            if (isNaN(discountVal) || discountVal < 100 || discountVal > 10000) {
                document.getElementById(`${prefix}DiscountValueError`).textContent = 'Discount must be between ₹100 and ₹10,000.';
                discountInput.classList.add('input-error');
                isValid = false;
            }
        }

        if (isNaN(minPurchaseVal) || minPurchaseVal < 1000) {
            document.getElementById(`${prefix}MinPurchaseError`).textContent = 'Minimum purchase must be at least ₹1000.';
            minPurchaseInput.classList.add('input-error');
            isValid = false;
        }

        if (isNaN(maxUsesVal) || maxUsesVal <= 0) {
            document.getElementById(`${prefix}MaxUsesError`).textContent = 'Usage limit must be greater than 0.';
            maxUsesInput.classList.add('input-error');
            isValid = false;
        }

        if (!validUntilVal) {
            document.getElementById(`${prefix}ValidUntilError`).textContent = 'Valid until date is required.';
            validUntilInput.classList.add('input-error');
            isValid = false;
        } else {
            const chosenDate = new Date(validUntilVal);
            chosenDate.setHours(23, 59, 59, 999);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            if (chosenDate < todayStart) {
                document.getElementById(`${prefix}ValidUntilError`).textContent = 'Date cannot be in the past.';
                validUntilInput.classList.add('input-error');
                isValid = false;
            }
        }

        return isValid;
    }

    const addCouponForm = document.getElementById('addCouponForm');
    if (addCouponForm) {
        addCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateCouponFields('add')) return;

            const submitBtn = document.getElementById('addCouponSubmitBtn');
            submitBtn.disabled = true;

            const type = document.getElementById('addDiscountType').value;
            const payload = {
                code: document.getElementById('addCouponCode').value.trim().toUpperCase(),
                status: document.getElementById('addCouponStatus').value,
                discountType: type,
                discountValue: Number(document.getElementById('addDiscountValue').value),
                minPurchase: Number(document.getElementById('addMinPurchase').value),
                maxRedeemAmount: type === 'percentage' ? Number(document.getElementById('addMaxPurchase').value) : null,
                usageLimit: Number(document.getElementById('addMaxUses').value),
                validUntil: document.getElementById('addValidUntil').value
            };

            try {
                const response = await fetch('/admin/coupons/create', {
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
                    closeModal('addCouponModal');
                    Swal.fire({
                        icon: 'success',
                        title: 'Created!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed',
                        text: data.message || 'Could not create coupon.',
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
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.trigger-view-btn');
        if (!viewBtn) return;

        const d = viewBtn.dataset;
        document.getElementById('viewCouponCode').innerHTML = `<span class="coupon-code-badge">${d.code}</span>`;
        document.getElementById('viewCouponStatus').innerHTML = d.status === 'active'
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-danger">Inactive</span>';
        document.getElementById('viewDiscountType').textContent = d.type;
        document.getElementById('viewDiscountValue').textContent = d.discount;
        document.getElementById('viewMinPurchase').textContent = d.min;
        
        const viewMaxCard = document.getElementById('viewMaxRedeemCard');
        if (d.max && d.max !== 'N/A') {
            viewMaxCard.classList.remove('d-none');
            document.getElementById('viewMaxPurchase').textContent = d.max;
        } else {
            viewMaxCard.classList.add('d-none');
        }

        document.getElementById('viewCouponUsage').innerHTML = `<span class="usage-badge">${d.usage}</span>`;
        document.getElementById('viewValidUntil').textContent = d.valid;

        openModal('viewCouponModal');
    });

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.trigger-edit-btn');
        if (!editBtn) return;

        clearFormErrors('editCouponForm');
        const d = editBtn.dataset;

        document.getElementById('editCouponId').value = d.id;
        document.getElementById('editCouponCode').value = d.code;
        document.getElementById('editCouponStatus').value = d.status;
        document.getElementById('editDiscountType').value = d.type;
        document.getElementById('editDiscountValue').value = d.discount;
        document.getElementById('editMinPurchase').value = d.min;
        document.getElementById('editMaxPurchase').value = d.max;
        document.getElementById('editMaxUses').value = d.usage;
        document.getElementById('editValidUntil').value = d.valid;

        handleDiscountTypeChange('edit');
        openModal('editCouponModal');
    });

    const editCouponForm = document.getElementById('editCouponForm');
    if (editCouponForm) {
        editCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateCouponFields('edit')) return;

            const couponId = document.getElementById('editCouponId').value;
            const submitBtn = document.getElementById('editCouponSubmitBtn');
            submitBtn.disabled = true;

            const type = document.getElementById('editDiscountType').value;
            const payload = {
                code: document.getElementById('editCouponCode').value.trim().toUpperCase(),
                status: document.getElementById('editCouponStatus').value,
                discountType: type,
                discountValue: Number(document.getElementById('editDiscountValue').value),
                minPurchase: Number(document.getElementById('editMinPurchase').value),
                maxRedeemAmount: type === 'percentage' ? Number(document.getElementById('editMaxPurchase').value) : null,
                usageLimit: Number(document.getElementById('editMaxUses').value),
                validUntil: document.getElementById('editValidUntil').value
            };

            try {
                const response = await fetch(`/admin/coupons/edit/${couponId}`, {
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
                    closeModal('editCouponModal');
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
                        text: data.message || 'Could not update coupon.',
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
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.trigger-toggle-btn');
        if (!toggleBtn) return;

        const { id, code, status } = toggleBtn.dataset;
        const willBlock = status === 'active';
        const actionText = willBlock ? 'block' : 'unblock';

        Swal.fire({
            icon: 'warning',
            title: `Confirm ${actionText.toUpperCase()}`,
            text: `Are you sure you want to ${actionText} coupon "${code}"?`,
            showCancelButton: true,
            confirmButtonText: `Yes, ${actionText}`,
            cancelButtonText: 'Cancel',
            confirmButtonColor: willBlock ? '#d93025' : '#1e8e3e',
            cancelButtonColor: '#757575',
            heightAuto: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/coupons/toggle-status/${id}`, {
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
                            text: data.message || 'Could not update status.',
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

    document.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.trigger-delete-btn');
        if (!delBtn) return;

        const { id, code } = delBtn.dataset;

        Swal.fire({
            icon: 'warning',
            title: 'Delete Coupon?',
            text: `Are you sure you want to delete coupon "${code}"? It will be permanently removed.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d93025',
            cancelButtonColor: '#757575',
            heightAuto: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/coupons/delete/${id}`, {
                        method: 'DELETE',
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
                            title: 'Deleted!',
                            text: data.message,
                            timer: 1500,
                            showConfirmButton: false,
                            heightAuto: false
                        }).then(() => window.location.reload());
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed',
                            text: data.message || 'Could not delete coupon.',
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
        const searchVal = document.getElementById('couponSearchInput')?.value.trim() || '';
        const typeVal = document.getElementById('discountTypeFilterSelect')?.value || 'all';
        const statusVal = document.getElementById('statusFilterSelect')?.value || 'all';

        const params = new URLSearchParams();
        if (searchVal) params.append('search', searchVal);
        if (typeVal !== 'all') params.append('type', typeVal);
        if (statusVal !== 'all') params.append('status', statusVal);
        params.append('page', '1');

        window.location.href = `/admin/coupons?${params.toString()}`;
    }

    const typeFilterSelect = document.getElementById('discountTypeFilterSelect');
    const statusFilterSelect = document.getElementById('statusFilterSelect');
    if (typeFilterSelect) typeFilterSelect.addEventListener('change', executeFilter);
    if (statusFilterSelect) statusFilterSelect.addEventListener('change', executeFilter);

    const searchInput = document.getElementById('couponSearchInput');
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