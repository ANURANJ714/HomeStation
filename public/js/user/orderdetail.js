document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const currentOrderId = document.getElementById('currentOrderId')?.value || '';

    const reviewModal = document.getElementById('reviewModal');
    const returnModal = document.getElementById('returnModal');
    const cancelOrderModal = document.getElementById('cancelOrderModal');

    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const submitReviewBtn = document.getElementById('submitReviewBtn');
    const reviewText = document.getElementById('reviewText');
    const reviewErrorMsg = document.getElementById('reviewErrorMsg');
    const modalReviewProductId = document.getElementById('modalReviewProductId');
    const reviewModalTitle = document.getElementById('reviewModalTitle');

    const returnModalTitle = document.getElementById('returnModalTitle');
    const modalTargetReturnItemId = document.getElementById('modalTargetReturnItemId');
    const openFullOrderReturnBtn = document.getElementById('openFullOrderReturnBtn');
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const cancelReturnBtn = document.getElementById('cancelReturnBtn');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');
    const customReturnReason = document.getElementById('customReturnReason');
    const returnReasonRadios = document.querySelectorAll('input[name="returnReasonRadio"]');

    const cancelModalTitle = document.getElementById('cancelModalTitle');
    const modalTargetCancelItemId = document.getElementById('modalTargetCancelItemId');
    const openFullOrderCancelBtn = document.getElementById('openFullOrderCancelBtn');
    const closeCancelOrderModalBtn = document.getElementById('closeCancelOrderModalBtn');
    const cancelCancelOrderBtn = document.getElementById('cancelCancelOrderBtn');
    const submitCancelOrderBtn = document.getElementById('submitCancelOrderBtn');
    const customCancelReason = document.getElementById('customCancelReason');
    const cancelReasonRadios = document.querySelectorAll('input[name="cancelReasonRadio"]');

    function showModal(el) { if (el) el.style.display = 'flex'; }
    function hideModal(el) { if (el) el.style.display = 'none'; }

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

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating, 10);
            highlightStars(selectedRating);
        });
    });

    document.querySelectorAll('.trigger-review-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prodId = btn.dataset.productId;
            const existingRating = parseInt(btn.dataset.existingRating, 10) || 5;
            const existingComment = btn.dataset.existingComment || '';

            modalReviewProductId.value = prodId;
            selectedRating = existingRating;
            highlightStars(selectedRating);
            reviewText.value = existingComment;
            if (reviewErrorMsg) reviewErrorMsg.textContent = '';

            if (existingComment.trim().length > 0) {
                reviewModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Review';
            } else {
                reviewModalTitle.innerHTML = '<i class="fa-solid fa-star"></i> Write a Review';
            }

            showModal(reviewModal);
        });
    });

    if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', () => hideModal(reviewModal));
    if (cancelReviewBtn) cancelReviewBtn.addEventListener('click', () => hideModal(reviewModal));

    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', async () => {
            const comment = reviewText.value.trim();
            const productId = modalReviewProductId.value;

            if (reviewErrorMsg) reviewErrorMsg.textContent = '';

            if (!comment) {
                if (reviewErrorMsg) reviewErrorMsg.textContent = 'Review comment cannot be empty.';
                return Swal.fire({
                    icon: 'warning',
                    title: 'Empty Review',
                    text: 'Please write a comment before submitting.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            if (comment.length < 10) {
                if (reviewErrorMsg) reviewErrorMsg.textContent = 'Review comment must be at least 10 characters long.';
                return Swal.fire({
                    icon: 'warning',
                    title: 'Too Short',
                    text: 'Review comment must be at least 10 characters long.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            submitReviewBtn.disabled = true;
            submitReviewBtn.textContent = 'Submitting...';

            try {
                const response = await fetch('/user/reviews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        productId,
                        rating: selectedRating,
                        comment
                    })
                });

                const data = await response.json();

                if (data.success) {
                    hideModal(reviewModal);
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
                        title: 'Submission Failed',
                        text: data.message || 'Could not save your review.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (err) {
                console.error('Review error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = 'Submit Review';
            }
        });
    }

    document.querySelectorAll('.trigger-item-return-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalTargetReturnItemId.value = btn.dataset.itemId;
            returnModalTitle.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Return Item';
            showModal(returnModal);
        });
    });

    if (openFullOrderReturnBtn) {
        openFullOrderReturnBtn.addEventListener('click', () => {
            modalTargetReturnItemId.value = ''; 
            returnModalTitle.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Return Entire Order';
            showModal(returnModal);
        });
    }

    if (closeReturnModalBtn) closeReturnModalBtn.addEventListener('click', () => hideModal(returnModal));
    if (cancelReturnBtn) cancelReturnBtn.addEventListener('click', () => hideModal(returnModal));

    returnReasonRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                customReturnReason.style.display = 'block';
                customReturnReason.focus();
            } else {
                customReturnReason.style.display = 'none';
                customReturnReason.value = '';
            }
        });
    });

    if (confirmReturnBtn) {
        confirmReturnBtn.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('input[name="returnReasonRadio"]:checked');

            if (!selectedRadio) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Reason Required',
                    text: 'Please select a reason for returning.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            let returnReason = selectedRadio.value;

            if (returnReason === 'other') {
                const customText = customReturnReason.value.trim();
                if (!customText) {
                    return Swal.fire({
                        icon: 'warning',
                        title: 'Specification Required',
                        text: 'Please write your return reason in the text box provided.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
                returnReason = customText;
            }

            confirmReturnBtn.disabled = true;
            confirmReturnBtn.textContent = 'Submitting...';

            try {
                const response = await fetch('/user/orders/return', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        orderId: currentOrderId,
                        orderItemId: modalTargetReturnItemId.value || null,
                        reason: returnReason
                    })
                });

                const data = await response.json();

                if (data.success) {
                    hideModal(returnModal);
                    Swal.fire({
                        icon: 'success',
                        title: 'Return Initiated',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Return Request Failed',
                        text: data.message || 'Unable to initiate return.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (err) {
                console.error('Return submit error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to reach the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                confirmReturnBtn.disabled = false;
                confirmReturnBtn.textContent = 'Confirm Return';
            }
        });
    }

    document.querySelectorAll('.trigger-item-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalTargetCancelItemId.value = btn.dataset.itemId;
            cancelModalTitle.innerHTML = '<i class="fa-solid fa-ban"></i> Cancel Item';
            showModal(cancelOrderModal);
        });
    });

    if (openFullOrderCancelBtn) {
        openFullOrderCancelBtn.addEventListener('click', () => {
            modalTargetCancelItemId.value = ''; 
            cancelModalTitle.innerHTML = '<i class="fa-solid fa-ban"></i> Cancel Entire Order';
            showModal(cancelOrderModal);
        });
    }

    if (closeCancelOrderModalBtn) closeCancelOrderModalBtn.addEventListener('click', () => hideModal(cancelOrderModal));
    if (cancelCancelOrderBtn) cancelCancelOrderBtn.addEventListener('click', () => hideModal(cancelOrderModal));

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

    if (submitCancelOrderBtn) {
        submitCancelOrderBtn.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('input[name="cancelReasonRadio"]:checked');

            if (!selectedRadio) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Reason Required',
                    text: 'Please select a reason for cancelling.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            let cancellationReason = selectedRadio.value;

            if (cancellationReason === 'other') {
                const customText = customCancelReason.value.trim();
                if (!customText) {
                    return Swal.fire({
                        icon: 'warning',
                        title: 'Specification Required',
                        text: 'Please write your reason in the text box provided.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
                cancellationReason = customText;
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
                        orderItemId: modalTargetCancelItemId.value || null,
                        reason: cancellationReason
                    })
                });

                const data = await response.json();

                if (data.success) {
                    hideModal(cancelOrderModal);
                    Swal.fire({
                        icon: 'success',
                        title: 'Cancelled',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Cancellation Failed',
                        text: data.message || 'Unable to cancel.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (err) {
                console.error('Cancellation error:', err);
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

    window.addEventListener('click', (e) => {
        if (e.target === reviewModal) hideModal(reviewModal);
        if (e.target === returnModal) hideModal(returnModal);
        if (e.target === cancelOrderModal) hideModal(cancelOrderModal);
    });

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