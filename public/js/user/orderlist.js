document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('orderSearchInput');
    const searchActionBtn = document.getElementById('searchActionBtn');
    const searchActionIcon = document.getElementById('searchActionIcon');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    function updateSearchButtonState() {
        if (!searchInput || !searchActionIcon || !searchActionBtn) return;
        if (searchInput.value.trim().length > 0) {
            searchActionIcon.className = "fa-solid fa-xmark";
            searchActionBtn.classList.add("text-danger");
        } else {
            searchActionIcon.className = "fa-solid fa-magnifying-glass";
            searchActionBtn.classList.remove("text-danger");
        }
    }

    if (searchInput) {
        updateSearchButtonState();

        searchInput.addEventListener('input', updateSearchButtonState);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitFilters();
            }
        });
    }

    if (searchActionBtn && searchInput) {
        searchActionBtn.addEventListener('click', () => {
            if (searchInput.value.trim().length > 0) {
                searchInput.value = '';
                updateSearchButtonState();
            }
            submitFilters();
        });
    }

    document.querySelectorAll('input[name="status"], input[name="time"]').forEach(input => {
        input.addEventListener('change', () => {
            submitFilters();
        });
    });

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="status"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('input[name="time"]').forEach(rb => rb.checked = false);
            if (searchInput) searchInput.value = '';
            window.location.href = '/user/orders';
        });
    }

    function submitFilters() {
        const statuses = [...document.querySelectorAll('input[name="status"]:checked')].map(el => el.value);
        const timeRadio = document.querySelector('input[name="time"]:checked');
        const searchTerm = searchInput ? searchInput.value.trim() : '';

        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        
        statuses.forEach(s => params.append('status', s));
        if (timeRadio) params.append('time', timeRadio.value);
        params.append('page', '1');

        window.location.href = `/user/orders?${params.toString()}`;
    }
});