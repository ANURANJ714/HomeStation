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
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const cancelReturnBtn = document.getElementById('cancelReturnBtn');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');
    const customReturnReason = document.getElementById('customReturnReason');
    const returnReasonRadios = document.querySelectorAll('input[name="returnReasonRadio"]');

    const cancelModalTitle = document.getElementById('cancelModalTitle');
    const modalTargetCancelItemId = document.getElementById('modalTargetCancelItemId');
    const closeCancelOrderModalBtn = document.getElementById('closeCancelOrderModalBtn');
    const cancelCancelOrderBtn = document.getElementById('cancelCancelOrderBtn');
    const submitCancelOrderBtn = document.getElementById('submitCancelOrderBtn');
    const customCancelReason = document.getElementById('customCancelReason');
    const cancelReasonRadios = document.querySelectorAll('input[name="cancelReasonRadio"]');

    const retryPaymentBtn = document.getElementById('retryPaymentBtn');

    function showModal(el) { if (el) el.classList.add('active'); }
    function hideModal(el) { if (el) el.classList.remove('active'); }

    if (retryPaymentBtn) {
    retryPaymentBtn.addEventListener('click', async () => {
        retryPaymentBtn.disabled = true;
        retryPaymentBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing...';

        try {
            const response = await fetch('/user/orders/retry-payment/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken,
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({ orderId: currentOrderId })
            });

            const data = await response.json();

            if (!data.success) {
                retryPaymentBtn.disabled = false;
                retryPaymentBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i> Retry Payment';
                return Swal.fire({
                    icon: 'error',
                    title: 'Unable to Retry Payment',
                    text: data.message || 'Could not initialize payment retry.',
                    confirmButtonColor: '#8b0000',
                    heightAuto: false
                });
            }

            const cleanOrderId = currentOrderId.replace(/^#/, '');

            const options = {
                key: data.razorpayKeyId,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: 'HomeStation',
                description: 'Retry Payment for ' + currentOrderId,
                order_id: data.razorpayOrderId,
                prefill: {
                    name: data.customerName,
                    email: data.customerEmail,
                    contact: data.customerPhone
                },
                theme: {
                    color: '#8b0000'
                },
                modal: {
                    ondismiss: function () {
                        retryPaymentBtn.disabled = false;
                        retryPaymentBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i> Retry Payment';
                        Swal.fire({
                            icon: 'warning',
                            title: 'Payment Cancelled',
                            text: 'The payment was not completed.',
                            timer: 2000,
                            showConfirmButton: false,
                            heightAuto: false
                        }).then(() => {
                            window.location.href = `/user/checkout/failure?orderId=${encodeURIComponent(cleanOrderId)}`;
                        });
                    }
                },
                handler: async function (paymentResponse) {
                    try {
                        retryPaymentBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirming...';

                        const verifyRes = await fetch('/user/orders/retry-payment/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken,
                                'x-csrf-token': csrfToken
                            },
                            body: JSON.stringify({
                                orderId: currentOrderId,
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyData.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Payment Successful!',
                                text: 'Your order has been confirmed.',
                                timer: 2000,
                                showConfirmButton: false,
                                heightAuto: false
                            }).then(() => {
                                window.location.href = verifyData.redirectUrl || `/user/checkout/success?orderId=${encodeURIComponent(currentOrderId)}`;
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Payment Failed',
                                text: verifyData.message || 'Payment confirmation failed.',
                                confirmButtonColor: '#8b0000',
                                heightAuto: false
                            }).then(() => {
                                window.location.href = `/user/checkout/failure?orderId=${encodeURIComponent(cleanOrderId)}`;
                            });
                        }
                    } catch (err) {
                        window.location.href = `/user/checkout/failure?orderId=${encodeURIComponent(cleanOrderId)}`;
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (failResponse) {
                const msg = failResponse.error?.description || 'Payment gateway transaction failed.';
                Swal.fire({
                    icon: 'error',
                    title: 'Payment Failed',
                    text: msg,
                    confirmButtonColor: '#8b0000',
                    heightAuto: false
                }).then(() => {
                    window.location.href = `/user/checkout/failure?orderId=${encodeURIComponent(cleanOrderId)}`;
                });
            });
            rzp.open();

        } catch (err) {
            retryPaymentBtn.disabled = false;
            retryPaymentBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i> Retry Payment';
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Unable to reach the server. Please try again.',
                confirmButtonColor: '#8b0000',
                heightAuto: false
            });
        }
    });
}

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

    if (closeReturnModalBtn) closeReturnModalBtn.addEventListener('click', () => hideModal(returnModal));
    if (cancelReturnBtn) cancelReturnBtn.addEventListener('click', () => hideModal(returnModal));

    returnReasonRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                customReturnReason.classList.add('visible');
                customReturnReason.focus();
            } else {
                customReturnReason.classList.remove('visible');
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
                        orderItemId: modalTargetReturnItemId.value,
                        reason: returnReason
                    })
                });

                const data = await response.json();

                if (data.success) {
                    hideModal(returnModal);
                    Swal.fire({
                        icon: 'success',
                        title: 'Request Submitted',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Return Request Failed',
                        text: data.message || 'Unable to submit return request.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (err) {
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

    if (closeCancelOrderModalBtn) closeCancelOrderModalBtn.addEventListener('click', () => hideModal(cancelOrderModal));
    if (cancelCancelOrderBtn) cancelCancelOrderBtn.addEventListener('click', () => hideModal(cancelOrderModal));

    cancelReasonRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'other') {
                customCancelReason.classList.add('visible');
                customCancelReason.focus();
            } else {
                customCancelReason.classList.remove('visible');
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
                        orderItemId: modalTargetCancelItemId.value,
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
});