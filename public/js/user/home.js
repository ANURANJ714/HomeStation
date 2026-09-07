document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeSidebarBtn = document.getElementById("closeSidebar");
  const appNavbar = document.getElementById("appNavbar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  function openMobileDrawer() {
    if (appNavbar) appNavbar.classList.add("active");
    if (sidebarOverlay) sidebarOverlay.classList.add("active");
  }

  function closeMobileDrawer() {
    if (appNavbar) appNavbar.classList.remove("active");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", openMobileDrawer);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeMobileDrawer);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeMobileDrawer);

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".clickable-product-card");
    if (!card) return;

    const actionBtn = e.target.closest(".add-to-cart-btn, .wishlist-btn");
    if (actionBtn) return;

    const productId = card.getAttribute("data-product-id");
    if (productId) {
      window.location.href = `/products/${productId}`;
    }
  });

  function updateHeaderBadge(type, count) {
    const badgeId = type === 'wishlist' ? 'headerWishlistBadge' : 'headerCartBadge';
    const parentSelector = type === 'wishlist' 
      ? '.wishlist-link .action-text-wrapper' 
      : '.cart-link .action-text-wrapper';
    
    let badge = document.getElementById(badgeId);
    const parentWrapper = document.querySelector(parentSelector);

    if (count > 0) {
      if (!badge && parentWrapper) {
        badge = document.createElement('span');
        badge.id = badgeId;
        badge.className = 'count-pill-badge';
        parentWrapper.appendChild(badge);
      }
      if (badge) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      }
    } else if (badge) {
      badge.remove();
    }
  }

  async function syncHeaderCounts() {
    try {
      const response = await fetch('/user/header-counts');
      if (response.ok) {
        const data = await response.json();
        if (data.cartCount !== undefined) updateHeaderBadge('cart', data.cartCount);
        if (data.wishlistCount !== undefined) updateHeaderBadge('wishlist', data.wishlistCount);
      }
    } catch (err) {
      window.location.reload();
    }
  }

  document.addEventListener("click", async (e) => {
    const addToCartBtn = e.target.closest(".add-to-cart-btn");
    if (addToCartBtn) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = addToCartBtn.getAttribute("data-variant-id");

      if (!variantId) return;

      try {
        const response = await fetch("/cart/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ variantId }),
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = "/user/login";
          return;
        }

        const data = await response.json();

        if (data.success) {
          if (data.totalQuantity !== undefined) {
            updateHeaderBadge('cart', data.totalQuantity);
          }

          Swal.fire({
            icon: "success",
            title: "Added to Cart!",
            text: data.message,
            timer: 1200,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Unable to Add",
            text: data.message || "Could not add item to cart.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Cart fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Could not connect to server.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    }
  });

  document.addEventListener("click", async (e) => {
    const wishlistBtn = e.target.closest(".wishlist-btn");
    if (wishlistBtn) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = wishlistBtn.getAttribute("data-variant-id");
      const icon = wishlistBtn.querySelector("i");

      if (!variantId) return;

      try {
        const response = await fetch("/wishlist/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ variantId }),
        });

        if (response.status === 401 || response.status === 403) {
          window.location.href = "/user/login";
          return;
        }

        const data = await response.json();

        if (data.success) {
          if (data.wishlistCount !== undefined) {
            updateHeaderBadge('wishlist', data.wishlistCount);
          }

          if (data.action === "added") {
            wishlistBtn.classList.add("liked");
            if (icon) icon.className = "fa-solid fa-heart";

            Swal.fire({
              icon: "success",
              title: "Added to Wishlist!",
              text: data.message,
              timer: 1200,
              showConfirmButton: false,
              heightAuto: false,
            }).then(() => {
              window.location.reload();
            });

          } else if (data.action === "removed") {
            wishlistBtn.classList.remove("liked");
            if (icon) icon.className = "fa-regular fa-heart";

            Swal.fire({
              icon: "success",
              title: "Removed from Wishlist!",
              text: data.message,
              timer: 1200,
              showConfirmButton: false,
              heightAuto: false,
            }).then(() => {
              window.location.reload();
            });
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: data.message || "Something went wrong.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Wishlist fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Could not connect to server.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    }
  });

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
});