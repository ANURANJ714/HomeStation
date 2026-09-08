document.addEventListener("DOMContentLoaded", () => {
    const sortDropdown = document.getElementById("sortReviews");
    const productId = document.getElementById("productIdHidden")?.value;

    if (sortDropdown && productId) {
        sortDropdown.addEventListener("change", function () {
            const selectedSort = this.value;
            window.location.href = `/products/${productId}/reviews?sort=${encodeURIComponent(selectedSort)}&page=1`;
        });
    }

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    function performSearch() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    }

    if (searchBtn) searchBtn.addEventListener("click", performSearch);
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") performSearch();
        });
    }
});