document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  function executeRedirectPipeline(targetPage = 1) {
    const priceSortValue =
      document.getElementById("priceFilter")?.value || "all";
    window.location.href = `/deals?page=${targetPage}&priceSort=${priceSortValue}`;
  }

  const priceFilterDropdown = document.getElementById("priceFilter");
  if (priceFilterDropdown) {
    priceFilterDropdown.addEventListener("change", () =>
      executeRedirectPipeline(1),
    );
  }

  document.querySelectorAll(".change-deals-page-btn").forEach((btn) => {
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

  document.querySelectorAll(".wishlist-btn").forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const variantId = this.getAttribute("data-variant-id");
      const icon = this.querySelector("i");
      const isLiked = this.classList.contains("liked");
      const targetUrl = isLiked ? "/wishlist/remove" : "/wishlist/add";

      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ variantId }),
        });

        if (response.status === 401) {
          window.location.href = "/user/login";
          return;
        }

        const data = await response.json();
        if (data.success) {
          this.classList.toggle("liked");
          if (icon)
            icon.className = isLiked
              ? "fa-regular fa-heart"
              : "fa-solid fa-heart";

          Swal.fire({
            icon: "success",
            title: "Wishlist Updated",
            text: isLiked
              ? "Item removed from wishlist!"
              : "Item added to wishlist!",
            timer: 1500,
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
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ variantId, quantity: 1 }),
        });
        if (response.status === 401) {
          window.location.href = "/user/login";
          return;
        }

        const data = await response.json();
        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Added to Cart",
            text: "Item added to cart successfully!",
            timer: 1500,
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
});