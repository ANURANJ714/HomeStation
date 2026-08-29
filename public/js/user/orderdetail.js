document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const currentOrderId = document.getElementById('currentOrderId')?.value || '';

    const reviewModal = document.getElementById('reviewModal');
    const returnModal = document.getElementById('returnModal');
    const cancelOrderModal = document.getElementById('cancelOrderModal');

    const openReviewBtn = document.getElementById('openReviewBtn');
    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const submitReviewBtn = document.getElementById('submitReviewBtn');

    const openReturnBtn = document.getElementById('openReturnBtn');
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const cancelReturnBtn = document.getElementById('cancelReturnBtn');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');

    const openCancelOrderBtn = document.getElementById('openCancelOrderBtn');
    const closeCancelOrderModalBtn = document.getElementById('closeCancelOrderModalBtn');
    const cancelCancelOrderBtn = document.getElementById('cancelCancelOrderBtn');
    const submitCancelOrderBtn = document.getElementById('submitCancelOrderBtn');

    const customCancelReason = document.getElementById('customCancelReason');
    const cancelReasonRadios = document.querySelectorAll('input[name="cancelReasonRadio"]');

    function showModal(el) { if (el) el.style.display = 'flex'; }
    function hideModal(el) { if (el) el.style.display = 'none'; }

    if (openReviewBtn) openReviewBtn.addEventListener('click', () => showModal(reviewModal));
    if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', () => hideModal(reviewModal));
    if (cancelReviewBtn) cancelReviewBtn.addEventListener('click', () => hideModal(reviewModal));

    if (openReturnBtn) openReturnBtn.addEventListener('click', () => showModal(returnModal));
    if (closeReturnModalBtn) closeReturnModalBtn.addEventListener('click', () => hideModal(returnModal));
    if (cancelReturnBtn) cancelReturnBtn.addEventListener('click', () => hideModal(returnModal));

    if (openCancelOrderBtn) openCancelOrderBtn.addEventListener('click', () => showModal(cancelOrderModal));
    if (closeCancelOrderModalBtn) closeCancelOrderModalBtn.addEventListener('click', () => hideModal(cancelOrderModal));
    if (cancelCancelOrderBtn) cancelCancelOrderBtn.addEventListener('click', () => hideModal(cancelOrderModal));

    window.addEventListener('click', (e) => {
        if (e.target === reviewModal) hideModal(reviewModal);
        if (e.target === returnModal) hideModal(returnModal);
        if (e.target === cancelOrderModal) hideModal(cancelOrderModal);
    });

    cancelReasonRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                customCancelReason.style.display = 'block';
                customCancelReason.focus();
            } else {
                customCancelReason.style.display = 'none';
                customCancelReason.value = '';
            }
        });
    });

    let selectedRating = 5;
    const ratingStars = document.querySelectorAll('.rating-star');
    
    function highlightStars(count) {
        ratingStars.forEach(star => {
            const val = parseInt(star.dataset.rating, 10);
            if (val <= count) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    highlightStars(selectedRating);

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating, 10);
            highlightStars(selectedRating);
        });
    });

    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', () => {
            const reviewText = document.getElementById('reviewText')?.value || '';
            hideModal(reviewModal);

            Swal.fire({
                icon: 'success',
                title: 'Review Submitted',
                text: 'Thank you for sharing your feedback with HomeStation!',
                confirmButtonColor: '#222',
                heightAuto: false
            });
        });
    }

    if (confirmReturnBtn) {
        confirmReturnBtn.addEventListener('click', () => {
            hideModal(returnModal);

            Swal.fire({
                icon: 'info',
                title: 'Return Initiated',
                text: 'Your return request has been submitted. Our team will contact you for pickup.',
                confirmButtonColor: '#222',
                heightAuto: false
            });
        });
    }

    if (submitCancelOrderBtn) {
        submitCancelOrderBtn.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('input[name="cancelReasonRadio"]:checked');
            let cancellationReason = selectedRadio ? selectedRadio.value : '';

            if (cancellationReason === 'other') {
                cancellationReason = customCancelReason.value.trim();
            }

            if (!cancellationReason) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Reason Required',
                    text: 'Please select or write a reason for cancelling your order.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            submitCancelOrderBtn.disabled = true;
            submitCancelOrderBtn.textContent = 'Cancelling...';

            try {
                const response = await fetch('/user/orders/cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        orderId: currentOrderId,
                        reason: cancellationReason
                    })
                });

                const data = await response.json();

                if (data.success) {
                    hideModal(cancelOrderModal);
                    Swal.fire({
                        icon: 'success',
                        title: 'Order Cancelled',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Cancellation Failed',
                        text: data.message || 'Unable to cancel this order.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                submitCancelOrderBtn.disabled = false;
                submitCancelOrderBtn.textContent = 'Confirm Cancellation';
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    function executeSearch() {
        if (!searchInput) return;
        const q = searchInput.value.trim();
        if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
    }

    if (searchBtn) searchBtn.addEventListener('click', executeSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }
});