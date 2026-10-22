document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    function bindDrawerEvents() {
        const hamburgerBtn = document.getElementById("hamburgerBtn");
        const closeSidebarBtn = document.getElementById("closeSidebar");
        const appNavbar = document.getElementById("appNavbar");
        const sidebarOverlay = document.getElementById("sidebarOverlay");

        if (hamburgerBtn && appNavbar && sidebarOverlay) {
            hamburgerBtn.onclick = () => {
                appNavbar.classList.add("active");
                sidebarOverlay.classList.add("active");
            };
        }

        if (closeSidebarBtn && appNavbar && sidebarOverlay) {
            closeSidebarBtn.onclick = () => {
                appNavbar.classList.remove("active");
                sidebarOverlay.classList.remove("active");
            };
        }

        if (sidebarOverlay && appNavbar) {
            sidebarOverlay.onclick = () => {
                appNavbar.classList.remove("active");
                sidebarOverlay.classList.remove("active");
            };
        }

        const searchInput = document.getElementById("searchInput");
        const searchBtn = document.getElementById("searchBtn");

        if (searchBtn) {
            searchBtn.onclick = () => executeFilterQuery(1);
        }
        if (searchInput) {
            searchInput.onkeypress = (e) => {
                if (e.key === "Enter") executeFilterQuery(1);
            };
        }
    }

    bindDrawerEvents();

    function updateHeaderBadge(type, count) {
        const badgeId = type === "wishlist" ? "headerWishlistBadge" : "headerCartBadge";
        const parentSelector = type === "wishlist"
            ? ".wishlist-link .action-text-wrapper"
            : ".cart-link .action-text-wrapper";

        let badge = document.getElementById(badgeId);
        const parentWrapper = document.querySelector(parentSelector);

        if (count > 0) {
            if (!badge && parentWrapper) {
                badge = document.createElement("span");
                badge.id = badgeId;
                badge.className = "count-pill-badge";
                parentWrapper.appendChild(badge);
            }
            if (badge) {
                badge.textContent = count;
                badge.classList.remove("badge-hidden");
            }
        } else if (badge) {
            badge.remove();
        }
    }

    async function syncHeaderCounts() {
        try {
            const response = await fetch("/user/header-counts");
            if (response.ok) {
                const data = await response.json();
                if (data.cartCount !== undefined) updateHeaderBadge("cart", data.cartCount);
                if (data.wishlistCount !== undefined) updateHeaderBadge("wishlist", data.wishlistCount);
            }
        } catch (err) {
            console.error("Failed to sync header counts", err);
        }
    }

    async function reloadHeaderPartial() {
        try {
            const response = await fetch(window.location.href, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            if (response.ok) {
                const htmlText = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, "text/html");
                const freshHeader = doc.getElementById("mainHeaderContainer");
                const currentContainer = document.getElementById("mainHeaderContainer");

                if (freshHeader && currentContainer) {
                    currentContainer.innerHTML = freshHeader.innerHTML;
                    bindDrawerEvents();
                    return;
                }
            }
            syncHeaderCounts();
        } catch (err) {
            syncHeaderCounts();
        }
    }

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

    document.addEventListener("click", (e) => {
        const card = e.target.closest(".clickable-product-card");
        if (!card) return;

        const actionBtn = e.target.closest(".wishlist-btn, .add-to-cart-btn");
        if (actionBtn) return;

        const productId = card.getAttribute("data-product-id");
        if (productId) {
            window.location.href = `/products/${productId}`;
        }
    });

    document.addEventListener("click", async (e) => {
        const wishlistBtn = e.target.closest(".wishlist-btn");
        if (!wishlistBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const variantId = wishlistBtn.getAttribute("data-variant-id");
        const icon = wishlistBtn.querySelector("i");
        const isLiked = wishlistBtn.classList.contains("liked");
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
                wishlistBtn.classList.toggle("liked");
                if (icon) {
                    icon.className = isLiked ? "fa-regular fa-heart" : "fa-solid fa-heart";
                }

                await reloadHeaderPartial();

                Swal.fire({ 
                    icon: "success", 
                    title: isLiked ? "Removed!" : "Added!", 
                    text: data.message, 
                    timer: 1200, 
                    showConfirmButton: false, 
                    heightAuto: false 
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

    document.addEventListener("click", async (e) => {
        const addToCartBtn = e.target.closest(".add-to-cart-btn");
        if (!addToCartBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const variantId = addToCartBtn.getAttribute("data-variant-id");

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
                await reloadHeaderPartial();

                Swal.fire({ 
                    icon: "success", 
                    title: "Added to Cart!", 
                    text: data.message, 
                    timer: 1200, 
                    showConfirmButton: false, 
                    heightAuto: false 
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