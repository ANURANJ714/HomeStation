document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    const alertStatus = document.getElementById("serverAlertStatus")?.value;
    const alertTitle = document.getElementById("serverAlertTitle")?.value;
    const alertMessage = document.getElementById("serverAlertMessage")?.value;

    if (alertStatus && alertMessage) {
        Swal.fire({
            icon: alertStatus,
            title: alertTitle || "Notice",
            text: alertMessage,
            confirmButtonColor: "#222",
            heightAuto: false
        });
    }

    function triggerFilterState(targetPage = 1) {
        const activeCategory = document.getElementById("currentCategoryFilter")?.value || "all";
        const selectedSort = document.getElementById("priceSort").value;
        const searchQuery = document.getElementById("searchInput").value.trim();
        
        const checkedBrands = [];
        document.querySelectorAll(".brand-checkbox:checked").forEach(checkbox => {
            checkedBrands.push(encodeURIComponent(checkbox.value));
        });

        let targetUrl = `/products?page=${targetPage}&category=${activeCategory}&sort=${selectedSort}`;
        if (checkedBrands.length > 0) {
            targetUrl += `&brands=${checkedBrands.join(",")}`;
        }
        if (searchQuery) {
            targetUrl += `&q=${encodeURIComponent(searchQuery)}`;
        }

        window.location.href = targetUrl;
    }

    const priceSortDropdown = document.getElementById("priceSort");
    if (priceSortDropdown) {
        priceSortDropdown.addEventListener("change", () => triggerFilterState(1));
    }

    document.querySelectorAll(".brand-checkbox").forEach(box => {
        box.addEventListener("change", () => triggerFilterState(1));
    });

    document.querySelectorAll(".change-page-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const page = this.getAttribute("data-page");
            triggerFilterState(page);
        });
    });

    document.querySelectorAll(".wishlist-btn").forEach(btn => {
        btn.addEventListener("click", async function(e) {
            e.preventDefault();
            const variantId = this.getAttribute("data-variant-id");
            const icon = this.querySelector("i");
            const isLiked = this.classList.contains("liked");
            
            const endpoint = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken
                    },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    if (isLiked) {
                        this.classList.remove("liked");
                        if (icon) icon.className = "fa-regular fa-heart";
                    } else {
                        this.classList.add("liked");
                        if (icon) icon.className = "fa-solid fa-heart";
                    }
                    Swal.fire({ icon: "success", title: "Success", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                } else {
                    Swal.fire({ icon: "warning", title: "Notice", text: data.message, heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Could not sync wishlist operation.", heightAuto: false });
            }
        });
    });

    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", async function(e) {
            e.preventDefault();
            const variantId = this.getAttribute("data-variant-id");

            try {
                const response = await fetch("/cart/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken
                    },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    Swal.fire({ icon: "success", title: "Added!", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                } else {
                    Swal.fire({ icon: "warning", title: "Unavailable", text: data.message, heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Could not add item to cart.", heightAuto: false });
            }
        });
    });

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    function executeSearch() {
        triggerFilterState(1);
    }

    if (searchBtn) searchBtn.addEventListener("click", executeSearch);
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") executeSearch();
        });
    }
});