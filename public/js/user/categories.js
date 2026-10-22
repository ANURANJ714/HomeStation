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
      heightAuto: false,
    });
  }

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

  function triggerFilterState(targetPage = 1) {
    const selectedSort = document.getElementById("priceSort")
      ? document.getElementById("priceSort").value
      : "all";
    const searchQuery = document.getElementById("searchInput")
      ? document.getElementById("searchInput").value.trim()
      : "";

    const selectedCategories = [];
    document.querySelectorAll(".cat-filter-item.active").forEach((btn) => {
      const catId = btn.getAttribute("data-category-id");
      if (catId) {
        selectedCategories.push(encodeURIComponent(catId));
      }
    });

    const checkedBrands = [];
    document.querySelectorAll(".brand-checkbox:checked").forEach((checkbox) => {
      checkedBrands.push(encodeURIComponent(checkbox.value));
    });

    let targetUrl = `/products?page=${targetPage}&sort=${selectedSort}`;
    if (selectedCategories.length > 0) {
      targetUrl += `&categories=${selectedCategories.join(",")}`;
    }
    if (checkedBrands.length > 0) {
      targetUrl += `&brands=${checkedBrands.join(",")}`;
    }
    if (searchQuery) {
      targetUrl += `&q=${encodeURIComponent(searchQuery)}`;
    }

    window.location.href = targetUrl;
  }

  document.querySelectorAll(".cat-filter-item").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      const icon = this.querySelector(".check-icon");
      if (this.classList.contains("active")) {
        if (icon) icon.className = "fa-solid fa-check check-icon";
      } else {
        if (icon) icon.className = "check-icon";
      }
      triggerFilterState(1);
    });
  });

  document.querySelectorAll(".brand-checkbox").forEach((box) => {
    box.addEventListener("change", () => triggerFilterState(1));
  });

  const priceSortDropdown = document.getElementById("priceSort");
  if (priceSortDropdown) {
    priceSortDropdown.addEventListener("change", () => triggerFilterState(1));
  }

  document.querySelectorAll(".change-page-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const page = this.getAttribute("data-page");
      triggerFilterState(page);
    });
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
          "CSRF-Token": csrfToken,
          "x-csrf-token": csrfToken,
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
          text: data.message,
          heightAuto: false,
        });
      }
    } catch (error) {
      console.error("Wishlist operation error:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not sync wishlist operation.",
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
          "CSRF-Token": csrfToken,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ variantId }),
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
          title: "Unavailable",
          text: data.message,
          heightAuto: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not add item to cart.",
        heightAuto: false,
      });
    }
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