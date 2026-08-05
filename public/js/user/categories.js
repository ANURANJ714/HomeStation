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
    const activeCategory =
      document.getElementById("currentCategoryFilter")?.value || "all";
    const selectedSort = document.getElementById("priceSort")
      ? document.getElementById("priceSort").value
      : "all";
    const searchQuery = document.getElementById("searchInput")
      ? document.getElementById("searchInput").value.trim()
      : "";

    const checkedBrands = [];
    document.querySelectorAll(".brand-checkbox:checked").forEach((checkbox) => {
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

  document.querySelectorAll(".brand-checkbox").forEach((box) => {
    box.addEventListener("change", () => triggerFilterState(1));
  });

  document.querySelectorAll(".change-page-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const page = this.getAttribute("data-page");
      triggerFilterState(page);
    });
  });

  document.querySelectorAll(".wishlist-btn").forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = this.getAttribute("data-variant-id");
      const icon = this.querySelector("i");

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
            this.classList.add("liked");
            if (icon) icon.className = "fa-solid fa-heart";
          } else {
            this.classList.remove("liked");
            if (icon) icon.className = "fa-regular fa-heart";
          }

          const alertContent = data.countMessage
            ? `${data.message}<br>${data.countMessage}`
            : data.message;

          Swal.fire({
            icon: "success",
            title: data.action === "added" ? "Added!" : "Removed!",
            html: alertContent,
            timer: 1500,
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
  });

  document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = this.getAttribute("data-variant-id");

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
          const alertContent = data.countMessage
            ? `${data.message}<br>${data.countMessage}`
            : data.message;

          Swal.fire({
            icon: "success",
            title: "Added!",
            html: alertContent,
            timer: 1500,
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
