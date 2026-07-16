document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    function executeRedirectPipeline(targetPage = 1) {
        const priceSortValue = document.getElementById("priceFilter").value;
        window.location.href = `/bestsellers?page=${targetPage}&priceSort=${priceSortValue}`;
    }

    const priceFilterDropdown = document.getElementById("priceFilter");
    if (priceFilterDropdown) {
        priceFilterDropdown.addEventListener("change", () => executeRedirectPipeline(1));
    }

    document.querySelectorAll(".change-bestsellers-page-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const requestedPage = this.getAttribute("data-page");
            if (requestedPage) executeRedirectPipeline(requestedPage);
        });
    });

    function fireToastNotification(msg) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = msg;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    document.querySelectorAll(".wishlist-btn").forEach(btn => {
        btn.addEventListener("click", async function(e) {
            e.preventDefault();
            const variantId = this.getAttribute("data-variant-id");
            const icon = this.querySelector("i");
            const isLiked = this.classList.contains("liked");
            const targetUrl = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const response = await fetch(targetUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "csrf-token": csrfToken },
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
                    fireToastNotification(isLiked ? "Item removed from wishlist!" : "Item added to wishlist!");
                }
            } catch (error) {
                console.error("Wishlist operation error:", error);
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
                    headers: { "Content-Type": "application/json", "csrf-token": csrfToken },
                    body: JSON.stringify({ variantId })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    fireToastNotification("Item added to cart successfully!");
                }
            } catch (error) {
                console.error("Cart operation error:", error);
            }
        });
    });
});