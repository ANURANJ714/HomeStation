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
        proceedToReviewBtn.addEventListener('click', async () => {
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
                    body: JSON.stringify({ paymentMode })
                });

                const data = await response.json();

                if (data.success && data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Selection Failed',
                        text: data.message || 'Unable to proceed to review.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                    proceedToReviewBtn.disabled = false;
                    proceedToReviewBtn.textContent = 'Proceed to Review';
                }
            } catch (error) {
                console.error('Error selecting payment mode:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Could not connect to the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
                proceedToReviewBtn.disabled = false;
                proceedToReviewBtn.textContent = 'Proceed to Review';
            }
        });
    }
});