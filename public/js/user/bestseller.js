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

    function performSearch() {
      if (!searchInput) return;
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    }

    if (searchBtn) searchBtn.onclick = performSearch;
    if (searchInput) {
      searchInput.onkeypress = (e) => {
        if (e.key === "Enter") performSearch();
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
          "X-Requested-With": "XMLHttpRequest",
        },
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

  function executeRedirectPipeline(targetPage = 1) {
    const priceSortValue = document.getElementById("priceFilter")?.value || "all";
    window.location.href = `/bestsellers?page=${targetPage}&priceSort=${priceSortValue}`;
  }

  const priceFilterDropdown = document.getElementById("priceFilter");
  if (priceFilterDropdown) {
    priceFilterDropdown.addEventListener("change", () => executeRedirectPipeline(1));
  }

  document.querySelectorAll(".change-bestsellers-page-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const requestedPage = this.getAttribute("data-page");
      if (requestedPage) executeRedirectPipeline(requestedPage);
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
        if (data.action === "added") {
          wishlistBtn.classList.add("liked");
          if (icon) icon.className = "fa-solid fa-heart";
        } else {
          wishlistBtn.classList.remove("liked");
          if (icon) icon.className = "fa-regular fa-heart";
        }

        await reloadHeaderPartial();

        Swal.fire({
          icon: "success",
          title: data.action === "added" ? "Added!" : "Removed!",
          text: data.message,
          timer: 1200,
          showConfirmButton: false,
          heightAuto: false,
        });
      } else {
        Swal.fire({
          icon: "warning",
          title: "Notice",
          text: data.message || "Failed to update wishlist.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    } catch (error) {
      console.error("Wishlist operation error:", error);
      Swal.fire({
        icon: "error",
        title: "Connection Error",
        text: "Failed to sync wishlist changes.",
        confirmButtonColor: "#222",
        heightAuto: false,
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
          "x-csrf-token": csrfToken,
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ variantId, quantity: 1 }),
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
          title: "Added!",
          text: data.message,
          timer: 1200,
          showConfirmButton: false,
          heightAuto: false,
        });
      } else {
        Swal.fire({
          icon: "warning",
          title: "Stock Warning",
          text: data.message || "Could not add item to cart.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    } catch (error) {
      console.error("Cart operation error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Could not add item to cart.",
        confirmButtonColor: "#222",
        heightAuto: false,
      });
    }
  });
});