document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const closeSidebarBtn = document.getElementById("closeSidebar");
    const appNavbar = document.getElementById("appNavbar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    function toggleMobileDrawer(show) {
        if (appNavbar) appNavbar.classList.toggle("active", show);
        if (sidebarOverlay) sidebarOverlay.classList.toggle("active", show);
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener("click", () => toggleMobileDrawer(true));
    if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", () => toggleMobileDrawer(false));
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", () => toggleMobileDrawer(false));

    const deleteModal = document.getElementById("deleteModal");
    const cartModal = document.getElementById("cartSuccessModal");
    let currentDeleteId = null;

    function closeModal(modalElement) {
        if (modalElement) modalElement.classList.remove("show");
    }

    window.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeModal(deleteModal);
        if (e.target === cartModal) closeModal(cartModal);
    });

    document.getElementById("cancelDeleteBtn")?.addEventListener("click", () => closeModal(deleteModal));
    document.getElementById("closeCartSuccessBtn")?.addEventListener("click", () => closeModal(cartModal));

    document.addEventListener("click", async (e) => {
        
        const addToCartBtn = e.target.closest(".add-to-cart-btn");
        if (addToCartBtn) {
            e.preventDefault();
            const variantId = addToCartBtn.getAttribute("data-variant-id");
            if (!variantId) return;

            try {
                const response = await fetch("/cart/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login"; 
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    if (cartModal) cartModal.classList.add("show");
                } else {
                    Swal.fire({ icon: "error", title: "Oops...", text: data.message || "Something went wrong.", heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Could not connect to the server.", heightAuto: false });
            }
        }

        const deleteTriggerBtn = e.target.closest(".trigger-delete-btn");
        if (deleteTriggerBtn) {
            e.preventDefault();
            currentDeleteId = deleteTriggerBtn.getAttribute("data-variant-id");
            const itemName = deleteTriggerBtn.getAttribute("data-name");
            
            document.getElementById("deleteItemName").innerText = itemName;
            deleteModal.classList.add("show");
        }
    });

    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async () => {
            if (!currentDeleteId) return;

            try {
                const response = await fetch("/wishlist/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({ variantId: currentDeleteId })
                });

                const data = await response.json();

                if (data.success && data.action === "removed") {
                    const itemElement = document.querySelector(`.wishlist-item[data-variant-id="${currentDeleteId}"]`);
                    if (itemElement) {
                        itemElement.style.opacity = '0';
                        itemElement.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            itemElement.remove();
                            if (document.querySelectorAll('.wishlist-item').length === 0) {
                                window.location.reload();
                            }
                        }, 300);
                    }
                } else {
                    Swal.fire({ icon: "error", title: "Oops...", text: data.message || "Failed to remove item.", heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Could not connect to the server.", heightAuto: false });
            } finally {
                closeModal(deleteModal);
                currentDeleteId = null;
            }
        });
    }

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    function performSearch() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }

    if (searchBtn) searchBtn.addEventListener("click", performSearch);
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") performSearch();
        });
    }
});