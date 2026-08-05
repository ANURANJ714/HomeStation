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
