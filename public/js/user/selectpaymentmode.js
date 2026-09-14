document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    function performSearch() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    const proceedToReviewBtn = document.getElementById('proceedToReviewBtn');
    if (proceedToReviewBtn) {
        async function submitPaymentSelection(stockResolution = null) {
            const selectedRadio = document.querySelector('input[name="payment-mode"]:checked');
            if (!selectedRadio) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Selection Required',
                    text: 'Please select a payment mode to proceed.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            const paymentMode = selectedRadio.value;
            proceedToReviewBtn.disabled = true;
            proceedToReviewBtn.textContent = 'Processing...';

            try {
                const response = await fetch('/user/checkout/payment/select', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ paymentMode, stockResolution })
                });

                const data = await response.json();

                if (data.reason === "STOCK_EXCEEDED") {
                    const itemLabel = data.productName ? `<b>${data.productName}</b>` : "This product variant";
                    Swal.fire({
                        icon: "warning",
                        title: "Limited Stock Available",
                        html: `${itemLabel} has only <b>${data.availableStock}</b> quantity available.<br><br>Do you want to proceed with this quantity or remove the item from the cart?`,
                        showCancelButton: true,
                        confirmButtonText: "Proceed",
                        cancelButtonText: "Remove",
                        confirmButtonColor: "#222",
                        cancelButtonColor: "#8b0000",
                        heightAuto: false,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                    }).then((res) => {
                        if (res.isConfirmed) {
                            submitPaymentSelection({
                                variantId: data.variantId,
                                action: "set",
                                targetQuantity: data.availableStock
                            });
                        } else if (res.dismiss === Swal.DismissReason.cancel) {
                            submitPaymentSelection({
                                variantId: data.variantId,
                                action: "remove"
                            });
                        }
                    });
                    return;
                }

                if (data.success && data.redirectUrl) {
                    if (data.warningNotice) {
                        return Swal.fire({
                            icon: "warning",
                            title: "Notice",
                            text: data.warningNotice,
                            confirmButtonText: "OK",
                            confirmButtonColor: "#222",
                            heightAuto: false,
                        }).then(() => {
                            window.location.href = data.redirectUrl;
                        });
                    }

                    window.location.href = data.redirectUrl;
                    return;
                }

                if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                    return;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Selection Failed',
                    text: data.message || 'Unable to proceed to review.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Could not connect to the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                proceedToReviewBtn.disabled = false;
                proceedToReviewBtn.textContent = 'Proceed to Review';
            }
        }

        proceedToReviewBtn.addEventListener('click', () => submitPaymentSelection());
    }
});