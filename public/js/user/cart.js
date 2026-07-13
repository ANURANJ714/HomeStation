document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const deleteModal = document.getElementById("deleteModal");
  const closeModalBtn = document.getElementById("closeModal");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  let currentDeleteCartId = null;

  const cartAlertMessage = document.getElementById("cartAlertMessage")?.value;
  if (cartAlertMessage && cartAlertMessage.trim() !== "") {
    Swal.fire({
      icon: "info",
      title: "Cart Updated",
      text: cartAlertMessage,
      confirmButtonColor: "#222",
      heightAuto: false,
    });
  }

  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".trigger-delete-btn");
    if (removeBtn) {
      e.preventDefault();
      currentDeleteCartId = removeBtn.getAttribute("data-cart-id");
      deleteModal.classList.add("active");
    }
  });

  function closeModal() {
    if (deleteModal) deleteModal.classList.remove("active");
    currentDeleteCartId = null;
  }

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeModal();
    });
  }

  document.addEventListener("click", async (e) => {
    const qtyBtn = e.target.closest(".qty-btn");
    if (!qtyBtn) return;

    e.preventDefault();
    const cartItemId = qtyBtn.getAttribute("data-cart-id");
    const action = qtyBtn.classList.contains("plus") ? "increase" : "decrease";
    const qtyInput = qtyBtn.parentElement.querySelector("input");
    const containerItemCard = qtyBtn.closest(".cart-item");

    try {
      const response = await fetch("/user/cart/change-quantity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ cartItemId, action }),
      });
      const data = await response.json();

      if (data.success) {
        if (data.action === "removed") {
          containerItemCard.style.opacity = "0";
          setTimeout(() => {
            containerItemCard.remove();
            if (document.querySelectorAll(".cart-item").length === 0) {
              window.location.reload();
            } else {
              updateSummaryInvoiceUI(data.totalQuantity, data.subtotal);
            }
          }, 300);
        } else {
          qtyInput.value = data.currentQuantity;
          updateSummaryInvoiceUI(data.totalQuantity, data.subtotal);
        }
      } else {
        if (data.reason === "PRODUCT_REMOVED") {
          Swal.fire({
            icon: "error",
            title: "Product Unavailable",
            text: data.message,
            heightAuto: false,
          }).then(() => {
            containerItemCard.style.opacity = "0";
            setTimeout(() => {
              containerItemCard.remove();
              if (document.querySelectorAll(".cart-item").length === 0)
                window.location.reload();
              else
                updateSummaryInvoiceUI(
                  data.totalQuantity || 0,
                  data.subtotal || 0,
                );
            }, 300);
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Stock Constraint",
            text: data.message,
            heightAuto: false,
          });
        }
      }
    } catch (error) {
      console.error("Fetch error on quantity change:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not update quantity.",
        heightAuto: false,
      });
    }
  });

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!currentDeleteCartId) return;

      const targetCartId = currentDeleteCartId;
      closeModal();

      try {
        const response = await fetch("/user/cart/remove-item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ cartItemId: targetCartId }),
        });

        const data = await response.json();

        if (data.success) {
          const itemElement = document.querySelector(
            `.cart-item[data-cart-id="${targetCartId}"]`,
          );
          if (itemElement) {
            itemElement.style.opacity = "0";
            itemElement.style.transform = "scale(0.9)";
            itemElement.style.transition = "all 0.3s ease";

            setTimeout(() => {
              itemElement.remove();
              if (document.querySelectorAll(".cart-item").length === 0) {
                window.location.reload();
              } else {
                updateSummaryInvoiceUI(data.totalQuantity, data.subtotal);
              }
            }, 300);
          }

          Swal.fire({
            icon: "success",
            title: "Removed!",
            text: data.message || "Item removed from cart.",
            timer: 1500,
            showConfirmButton: false,
            heightAuto: false,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to remove the product.",
            heightAuto: false,
          });
        }
      } catch (error) {
        console.error("Cart deletion exception:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to remove the item safely.",
          heightAuto: false,
        });
      }
    });
  }

  function updateSummaryInvoiceUI(totalQty, subtotalAmt) {
    const pageTitleElement = document.querySelector(".page-title");
    if (pageTitleElement)
      pageTitleElement.innerText = `Shopping Cart (${totalQty} Items)`;

    const labelRow = document.querySelector(
      ".summary-row:first-of-type span:first-child",
    );
    if (labelRow)
      labelRow.innerHTML = `Cart Subtotal (${totalQty} items) <br><small>(Inclusive of 18% GST)</small>`;

    const priceDisplay = document.querySelector(
      ".summary-row:first-of-type span:last-child",
    );
    if (priceDisplay)
      priceDisplay.innerText = `₹${subtotalAmt.toLocaleString("en-IN")}`;

    const totalPayable = Math.max(subtotalAmt - 1500, 0);
    const totalUI = document.querySelector(
      ".summary-row.total span:last-child",
    );
    if (totalUI) totalUI.innerText = `₹${totalPayable.toLocaleString("en-IN")}`;
  }

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  function performSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (query) window.location.href = `/search?q=${encodeURIComponent(query)}`;
  }

  if (searchBtn) searchBtn.addEventListener("click", performSearch);
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });
  }
});
