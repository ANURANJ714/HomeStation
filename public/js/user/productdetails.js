document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";
    const baseProductId = document.getElementById("productBaseId")?.value;

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

    document.addEventListener("click", (e) => {
        const card = e.target.closest(".clickable-product-card");
        if (!card) return;

        const actionBtn = e.target.closest(".inline-related-wishlist-toggle, .inline-related-cart-addition");
        if (actionBtn) return;

        const productId = card.getAttribute("data-product-id");
        if (productId) {
            window.location.href = `/products/${productId}`;
        }
    });

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
        }).then(() => {
            window.location.href = "/products";
        });
        return; 
    }

    const imageContainer = document.getElementById("mainImageContainer");
    const mainProductImage = document.getElementById("main-product-image");
    const zoomLens = document.getElementById("imageZoomLens");
    const zoomResult = document.getElementById("imageZoomResult");

    function updateZoomBackground() {
        if (zoomResult && mainProductImage) {
            zoomResult.style.backgroundImage = `url('${mainProductImage.src}')`;
        }
    }

    function initImageZoom() {
        if (!imageContainer || !mainProductImage || !zoomLens || !zoomResult) return;

        updateZoomBackground();

        function moveLens(e) {
            if (window.innerWidth <= 992) return;

            const rect = mainProductImage.getBoundingClientRect();
            let x = e.clientX - rect.left - (zoomLens.offsetWidth / 2);
            let y = e.clientY - rect.top - (zoomLens.offsetHeight / 2);

            if (x > mainProductImage.offsetWidth - zoomLens.offsetWidth) {
                x = mainProductImage.offsetWidth - zoomLens.offsetWidth;
            }
            if (x < 0) x = 0;

            if (y > mainProductImage.offsetHeight - zoomLens.offsetHeight) {
                y = mainProductImage.offsetHeight - zoomLens.offsetHeight;
            }
            if (y < 0) y = 0;

            zoomLens.style.left = x + "px";
            zoomLens.style.top = y + "px";

            const cx = zoomResult.offsetWidth / zoomLens.offsetWidth;
            const cy = zoomResult.offsetHeight / zoomLens.offsetHeight;

            zoomResult.style.backgroundSize = `${mainProductImage.offsetWidth * cx}px ${mainProductImage.offsetHeight * cy}px`;
            zoomResult.style.backgroundPosition = `-${x * cx}px -${y * cy}px`;
        }

        imageContainer.addEventListener("mouseenter", () => {
            if (window.innerWidth > 992) {
                updateZoomBackground();
                zoomLens.style.display = "block";
                zoomResult.style.display = "block";
            }
        });

        imageContainer.addEventListener("mouseleave", () => {
            zoomLens.style.display = "none";
            zoomResult.style.display = "none";
        });

        imageContainer.addEventListener("mousemove", moveLens);
    }

    initImageZoom();

    const zoomModal = document.getElementById("imageZoomModal");
    const zoomedImg = document.getElementById("zoomedImage");
    const closeZoomBtn = document.getElementById("closeZoomOverlayTargetBtn");

    if (imageContainer && zoomModal && zoomedImg) {
        imageContainer.addEventListener("click", () => {
            if (zoomLens) zoomLens.style.display = "none";
            if (zoomResult) zoomResult.style.display = "none";

            zoomedImg.src = mainProductImage.src;
            zoomedImg.classList.remove("zoomed");
            zoomModal.style.display = "flex";
        });
    }

    if (closeZoomBtn && zoomModal) {
        closeZoomBtn.addEventListener("click", () => {
            zoomModal.style.display = "none";
        });
    }

    if (zoomModal) {
        zoomModal.addEventListener("click", (e) => {
            if (e.target === zoomModal) zoomModal.style.display = "none";
        });
    }

    if (zoomedImg) {
        zoomedImg.addEventListener("click", function(e) {
            e.stopPropagation();
            this.classList.toggle("zoomed");
        });
    }

    document.querySelectorAll(".custom-thumb-click").forEach(thumb => {
        thumb.addEventListener("click", function() {
            document.querySelectorAll(".custom-thumb-click").forEach(t => t.classList.remove("active"));
            this.classList.add('active');
            if (mainProductImage) {
                mainProductImage.src = this.getAttribute("data-src");
                updateZoomBackground();
            }
        });
    });

    document.querySelectorAll(".variant-selector-input").forEach(radio => {
        radio.addEventListener("change", function() {
            if (this.checked) {
                document.getElementById("renderedCurrentPrice").textContent = this.getAttribute("data-price");
                
                const origPrice = this.getAttribute("data-orig");
                const discBadge = this.getAttribute("data-disc");
                const origElement = document.getElementById("renderedOriginalPrice");
                const badgeElement = document.getElementById("renderedDiscountBadge");

                if (origPrice) {
                    origElement.textContent = origPrice;
                    origElement.classList.remove("hidden");
                    badgeElement.textContent = discBadge;
                    badgeElement.classList.remove("hidden");
                } else {
                    origElement.classList.add("hidden");
                    badgeElement.classList.add("hidden");
                }
            }
        });
    });

    const sizeChartModal = document.getElementById("sizeChartModal");
    const openSizeChartBtn = document.getElementById("openSizeChartBtn");
    const closeSizeChartModalBtn = document.getElementById("closeSizeChartModalBtn");

    if (openSizeChartBtn && sizeChartModal) {
        openSizeChartBtn.addEventListener("click", () => sizeChartModal.style.display = "flex");
    }
    if (closeSizeChartModalBtn) {
        closeSizeChartModalBtn.addEventListener("click", () => sizeChartModal.style.display = "none");
    }
    if (sizeChartModal) {
        sizeChartModal.addEventListener("click", (e) => {
            if (e.target === sizeChartModal) sizeChartModal.style.display = "none";
        });
    }

    const qtyInput = document.getElementById("qty-input");
    const qtyMinusBtn = document.getElementById("qtyMinusBtn");
    const qtyPlusBtn = document.getElementById("qtyPlusBtn");

    const MAX_QUANTITY = 5;

    if (qtyMinusBtn && qtyInput) {
        qtyMinusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val > 1) {
                qtyInput.value = val - 1;
            }
        });
    }

    if (qtyPlusBtn && qtyInput) {
        qtyPlusBtn.addEventListener("click", () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val < MAX_QUANTITY) {
                qtyInput.value = val + 1;
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Limit Reached",
                    text: "Maximum quantity limit is 5 items per order.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }
        });
    }

    const primaryWishlistBtn = document.getElementById("primaryToggleWishlistBtn");
    if (primaryWishlistBtn) {
        primaryWishlistBtn.addEventListener("click", async function() {
            const activeInput = document.querySelector(".variant-selector-input:checked");
            if (!activeInput) return;
            
            const variantId = activeInput.value;
            const icon = this.querySelector("i");
            const isLiked = this.classList.contains("liked");
            const targetUrl = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const response = await fetch(targetUrl, {
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
                    Swal.fire({ icon: "success", title: "Success", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                } else {
                    Swal.fire({ icon: "warning", title: "Notice", text: data.message, heightAuto: false });
                }
            } catch (error) {
                console.error("Wishlist sync error:", error);
            }
        });
    }

    const primaryAddToCartBtn = document.getElementById("primaryAddToCartBtn");
    if (primaryAddToCartBtn) {
        primaryAddToCartBtn.addEventListener("click", async function() {
            const activeInput = document.querySelector(".variant-selector-input:checked");
            if (!activeInput) return;

            const variantId = activeInput.value;
            const quantity = parseInt(qtyInput.value, 10) || 1;

            try {
                const response = await fetch("/cart/add", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken 
                    },
                    body: JSON.stringify({ variantId, quantity }) 
                });
                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }
                const data = await response.json();
                if (data.success) {
                    Swal.fire({ icon: "success", title: "Added to Cart", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                } else {
                    Swal.fire({ icon: "warning", title: "Stock Warning", text: data.message, heightAuto: false });
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Error", text: "Network connection lost.", heightAuto: false });
            }
        });
    }

    document.addEventListener("click", async (e) => {
        const relCartBtn = e.target.closest(".inline-related-cart-addition");
        if (relCartBtn) {
            e.preventDefault();
            e.stopPropagation();
            const variantId = relCartBtn.getAttribute("data-variant-id");
            try {
                const res = await fetch("/cart/add", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken 
                    },
                    body: JSON.stringify({ variantId, quantity: 1 })
                });
                if (res.status === 401 || res.status === 403) { window.location.href = "/user/login"; return; }
                const data = await res.json();
                if (data.success) Swal.fire({ icon: "success", title: "Added", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                else Swal.fire({ icon: "warning", title: "Unavailable", text: data.message, heightAuto: false });
            } catch (err) { console.error(err); }
        }

        const relWishBtn = e.target.closest(".inline-related-wishlist-toggle");
        if (relWishBtn) {
            e.preventDefault();
            e.stopPropagation();
            const variantId = relWishBtn.getAttribute("data-variant-id");
            const icon = relWishBtn.querySelector("i");
            const isLiked = relWishBtn.classList.contains("liked");
            const path = isLiked ? "/wishlist/remove" : "/wishlist/add";

            try {
                const res = await fetch(path, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken 
                    },
                    body: JSON.stringify({ variantId })
                });
                if (res.status === 401 || res.status === 403) { window.location.href = "/user/login"; return; }
                const data = await res.json();
                if (data.success) {
                    relWishBtn.classList.toggle("liked");
                    if (icon) icon.className = isLiked ? "fa-regular fa-heart" : "fa-solid fa-heart";
                    Swal.fire({ icon: "success", title: "Updated", text: data.message, timer: 1500, showConfirmButton: false, heightAuto: false });
                }
            } catch (err) { console.error(err); }
        }
    });
});