document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    function executeFilterQuery(targetPage = 1) {
        const queryInput = document.getElementById("searchInput");
        const cacheInput = document.getElementById("activeSearchQueryCache");
        const queryValue = (queryInput ? queryInput.value.trim() : "") || (cacheInput ? cacheInput.value.trim() : "");
        const sortSelect = document.getElementById("priceSort");
        const sortValue = sortSelect ? sortSelect.value : "all";

        let url = `/search?page=${targetPage}&sort=${encodeURIComponent(sortValue)}`;
        if (queryValue) {
            url += `&q=${encodeURIComponent(queryValue)}`;
        }
        window.location.href = url;
    }

    const priceSort = document.getElementById("priceSort");
    if (priceSort) {
        priceSort.addEventListener("change", () => executeFilterQuery(1));
    }

    document.querySelectorAll(".navigate-page-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const requestedPageNum = this.getAttribute("data-page");
            if (requestedPageNum) executeFilterQuery(requestedPageNum);
        });
    });

    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchInput");

    if (searchBtn) {
        searchBtn.addEventListener("click", () => executeFilterQuery(1));
    }
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') executeFilterQuery(1);
        });
    }

    document.querySelectorAll(".wishlist-btn").forEach(btn => {
        btn.addEventListener("click", async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const variantId = this.getAttribute("data-variant-id");
            const icon = this.querySelector("i");
            const isLiked = this.classList.contains("liked");
            
            const targetEndpoint = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const response = await fetch(targetEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken
                    },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    this.classList.toggle("liked");
                    if (icon) icon.className = isLiked ? "fa-regular fa-heart" : "fa-solid fa-heart";

                    Swal.fire({ 
                        icon: "success", 
                        title: isLiked ? "Removed!" : "Added!", 
                        text: data.message, 
                        timer: 1200, 
                        showConfirmButton: false, 
                        heightAuto: false 
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({ 
                        icon: "warning", 
                        title: "Notice", 
                        text: data.message, 
                        heightAuto: false 
                    });
                }
            } catch (error) {
                Swal.fire({ 
                    icon: "error", 
                    title: "Network Error", 
                    text: "Failed to connect to the server.", 
                    heightAuto: false 
                });
            }
        });
    });

    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const variantId = this.getAttribute("data-variant-id");

            try {
                const response = await fetch("/cart/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken
                    },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    Swal.fire({ 
                        icon: "success", 
                        title: "Added to Cart!", 
                        text: data.message, 
                        timer: 1200, 
                        showConfirmButton: false, 
                        heightAuto: false 
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({ 
                        icon: "warning", 
                        title: "Notice", 
                        text: data.message, 
                        heightAuto: false 
                    });
                }
            } catch (error) {
                Swal.fire({ 
                    icon: "error", 
                    title: "Network Error", 
                    text: "Could not add item to cart.", 
                    heightAuto: false 
                });
            }
        });
    });
});