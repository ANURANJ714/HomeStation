document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const currentOrderId = document.getElementById('currentOrderId')?.value || '';

    const reviewModal = document.getElementById('reviewModal');
    const returnModal = document.getElementById('returnModal');

    const openReviewBtn = document.getElementById('openReviewBtn');
    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const submitReviewBtn = document.getElementById('submitReviewBtn');

    const openReturnBtn = document.getElementById('openReturnBtn');
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const cancelReturnBtn = document.getElementById('cancelReturnBtn');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');

    function showModal(el) { if (el) el.style.display = 'flex'; }
    function hideModal(el) { if (el) el.style.display = 'none'; }

    if (openReviewBtn) openReviewBtn.addEventListener('click', () => showModal(reviewModal));
    if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', () => hideModal(reviewModal));
    if (cancelReviewBtn) cancelReviewBtn.addEventListener('click', () => hideModal(reviewModal));

    if (openReturnBtn) openReturnBtn.addEventListener('click', () => showModal(returnModal));
    if (closeReturnModalBtn) closeReturnModalBtn.addEventListener('click', () => hideModal(returnModal));
    if (cancelReturnBtn) cancelReturnBtn.addEventListener('click', () => hideModal(returnModal));

    window.addEventListener('click', (e) => {
        if (e.target === reviewModal) hideModal(reviewModal);
        if (e.target === returnModal) hideModal(returnModal);
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