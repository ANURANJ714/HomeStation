document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  const urlParams = new URLSearchParams(window.location.search);
  const showWishlistAlert = urlParams.get("wishlistAdded") === "true" || sessionStorage.getItem("pendingWishlistAlert") === "true";

  if (showWishlistAlert) {
    Swal.fire({
      icon: "success",
      title: "Added!",
      text: "Item added to your wishlist successfully.",
      timer: 2000,
      showConfirmButton: false,
      heightAuto: false,
    });
    
    sessionStorage.removeItem("pendingWishlistAlert");
    if (urlParams.get("wishlistAdded")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeSidebarBtn = document.getElementById('closeSidebar');
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
    const addToCartBtn = e.target.closest(".add-to-cart-btn");
    if (addToCartBtn) {
      e.preventDefault();

      Swal.fire({
        icon: "success",
        title: "Added to Cart!",
        text: "Item added to cart successfully.",
        timer: 2000,
        showConfirmButton: false,
        heightAuto: false,
      });
    }
  });

  document.addEventListener("click", async (e) => {
    const wishlistBtn = e.target.closest(".wishlist-btn");
    if (wishlistBtn) {
      e.preventDefault();

      const variantId = wishlistBtn.getAttribute("data-variant-id");
      const icon = wishlistBtn.querySelector("i");

      if (!variantId) {
        console.error("No variant ID found on this button.");
        return;
      }

      try {
        const response = await fetch("/wishlist/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ variantId: variantId }),
        });

        if (response.status === 401) {
          const data = await response.json();
          if (data.redirectUrl) {
            sessionStorage.setItem("pendingWishlistAlert", "true");
            window.location.href = data.redirectUrl;
          }
          return;
        }

        if (response.redirected && response.url.includes("/login")) {
          sessionStorage.setItem("pendingWishlistAlert", "true");
          window.location.href = response.url;
          return;
        }

        const data = await response.json();

        if (data.success) {
          if (data.action === "added") {
            wishlistBtn.classList.add("liked");
            if (icon) icon.className = "fa-solid fa-heart";

            Swal.fire({
              icon: "success",
              title: "Added!",
              text: data.message,
              timer: 1500,
              showConfirmButton: false,
              heightAuto: false,
            });
          } else if (data.action === "removed") {
            wishlistBtn.classList.remove("liked");
            if (icon) icon.className = "fa-regular fa-heart";

            Swal.fire({
              icon: "info",
              title: "Removed",
              text: data.message,
              timer: 1500,
              showConfirmButton: false,
              heightAuto: false,
            });
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: data.message || "Something went wrong.",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Wishlist fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Could not connect to the server.",
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