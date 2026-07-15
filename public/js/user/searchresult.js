document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    function executeFilterQuery(targetPage = 1) {
        const queryValue = document.getElementById("searchInput").value.trim();
        const sortValue = document.getElementById("priceSort").value;

        if (queryValue) {
            window.location.href = `/search?q=${encodeURIComponent(queryValue)}&sort=${sortValue}&page=${targetPage}`;
        }
    }

    const priceSort = document.getElementById("priceSort");
    if (priceSort) {
        priceSort.addEventListener("change", () => executeFilterQuery(1));
    }

    document.querySelectorAll(".navigate-page-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const requestedPageNum = this.getAttribute("data-page");
            executeFilterQuery(requestedPageNum);
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
            const variantId = this.getAttribute("data-variant-id");
            const icon = this.querySelector("i");
            const isLiked = this.classList.contains("liked");
            
            const targetEndpoint = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const response = await fetch(targetEndpoint, {
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
                    this.classList.toggle("liked");
                    if (icon) icon.className = isLiked ? "fa-regular fa-heart" : "fa-solid fa-heart";
                    Swal.fire({ icon: "success", title: "Success", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                } else {
                    Swal.fire({ icon: "warning", title: "Notice", text: data.message, heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Failed to connect to the server.", heightAuto: false });
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
                    Swal.fire({ icon: "warning", title: "Notice", text: data.message, heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Network Error", text: "Could not add item to cart.", heightAuto: false });
            }
        });
    });
});