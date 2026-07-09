document.addEventListener("DOMContentLoaded", () => {
    const deleteModal = document.getElementById('deleteModal');
    const closeModalBtn = document.getElementById('closeModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    
    let currentDeleteCartId = null;

    document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.trigger-delete-btn');
        if (removeBtn) {
            e.preventDefault();
            currentDeleteCartId = removeBtn.getAttribute('data-cart-id');
            deleteModal.classList.add('active');
        }
    });

    function closeModal() {
        deleteModal.classList.remove('active');
        currentDeleteCartId = null;
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeModal();
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (!currentDeleteCartId) return;
            
            console.log(`Ready to delete cart item: ${currentDeleteCartId}`);
            
            const itemElement = document.querySelector(`.cart-item[data-cart-id="${currentDeleteCartId}"]`);
            if (itemElement) itemElement.remove();
            closeModal();
        });
    }

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
});