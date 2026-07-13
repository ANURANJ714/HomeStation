document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";
    const logoutForm = document.getElementById('logoutForm');
    
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/user/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    }
                });
                const data = await response.json();
                if (data.success && data.redirectUrl) {
                    Swal.fire({
                        icon: "success",
                        title: "Goodbye!",
                        text: data.message || "Logged out successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = data.redirectUrl;
                    });
                } else {
                    Swal.fire({ icon: "error", title: "Logout Failed", text: data.message || "Something went wrong.", heightAuto: false });
                }
            } catch (error) {
                console.error("Logout fetch error:", error);
            }
        });
    }

    const deleteModal = document.getElementById("deleteModal");
    let currentDeleteId = null;

    function closeModal(modalElement) {
        if (modalElement) modalElement.classList.remove("show");
    }

    window.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeModal(deleteModal);
    });

    document.getElementById("cancelDeleteBtn")?.addEventListener("click", () => closeModal(deleteModal));

    document.addEventListener("click", async (e) => {
        const addToCartBtn = e.target.closest(".add-to-cart-btn");
        if (addToCartBtn) {
            e.preventDefault();
            const variantId = addToCartBtn.getAttribute("data-variant-id");
            if (!variantId) return;

            const itemElement = addToCartBtn.closest(".wishlist-item");

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

                    Swal.fire({
                        icon: "success",
                        title: "Added to Cart!",
                        text: data.message || "Item successfully moved to your shopping cart.",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    });
                } else {
                    if (data.reason === 'OUT_OF_STOCK') {
                        Swal.fire({ icon: "warning", title: "Product Out Of Stock", text: data.message, heightAuto: false })
                            .then(() => window.location.reload());
                    } else if (data.reason === 'PRODUCT_REMOVED') {
                        Swal.fire({ icon: "error", title: "Product Removed", text: data.message, heightAuto: false })
                            .then(() => window.location.reload());
                    } else {
                        Swal.fire({ icon: "error", title: "Oops...", text: data.message || "Something went wrong.", heightAuto: false });
                    }
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
                const response = await fetch("/wishlist/remove", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({ variantId: currentDeleteId })
                });

                const data = await response.json();

                if (data.success) {
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

                    Swal.fire({
                        icon: "success",
                        title: "Removed!",
                        text: data.message || "Item removed from your wishlist successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    });
                } else {
                    Swal.fire({ icon: "error", title: "Oops...", text: data.message || "Failed to remove item.", heightAuto: false });
                }
            } catch (error) {
                console.error("Wishlist deletion error:", error);
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