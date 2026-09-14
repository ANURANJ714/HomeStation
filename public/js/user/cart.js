document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const deleteModal = document.getElementById("deleteModal");
  const closeModalBtn = document.getElementById("closeModal");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  let currentDeleteCartId = null;

  const noticeNode = document.getElementById("unavailableNoticePayload");
  if (noticeNode && noticeNode.value) {
    let noticeObj = null;
    try {
      noticeObj = JSON.parse(decodeURIComponent(noticeNode.value));
    } catch (e) {
      noticeObj = null;
    }

    if (noticeObj && noticeObj.message) {
      Swal.fire({
        icon: "warning",
        title: noticeObj.title || "Product Notice",
        text: noticeObj.message,
        confirmButtonText: "OK",
        confirmButtonColor: "#222",
        heightAuto: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        noticeNode.remove();
      });
    }
  }

  function promptStockResolution(cartItemId, productName, availableStock) {
    const itemLabel = productName ? `<b>${productName}</b>` : "This product variant";

    Swal.fire({
      icon: "warning",
      title: "Limited Stock Available",
      html: `${itemLabel} has only <b>${availableStock}</b> quantity available.<br><br>Do you want to proceed with this quantity or remove the item from the cart?`,
      showCancelButton: true,
      confirmButtonText: "Proceed",
      cancelButtonText: "Remove",
      confirmButtonColor: "#222",
      cancelButtonColor: "#8b0000",
      heightAuto: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch("/user/cart/change-quantity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
              "x-csrf-token": csrfToken
            },
            body: JSON.stringify({
              cartItemId: cartItemId,
              action: "set",
              targetQuantity: availableStock
            }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            Swal.fire({
              icon: "error",
              title: "Update Failed",
              text: data.message || "Failed to adjust quantity.",
              confirmButtonColor: "#222",
              heightAuto: false,
            });
          }
        } catch (err) {
          window.location.reload();
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        try {
          const res = await fetch("/user/cart/remove-item", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
              "x-csrf-token": csrfToken
            },
            body: JSON.stringify({ cartItemId: cartItemId }),
          });
          const data = await res.json();
          if (data.success) {
            Swal.fire({
              icon: "success",
              title: "Removed!",
              text: data.message || "Item removed from your cart successfully.",
              timer: 1200,
              showConfirmButton: false,
              heightAuto: false,
            }).then(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        } catch (err) {
          window.location.reload();
        }
      }
    });
  }

  const alertItemId = document.getElementById("stockAlertItemId")?.value;
  const alertAvailable = document.getElementById("stockAlertAvailable")?.value;
  const alertName = document.getElementById("stockAlertName")?.value;

  if (alertItemId && alertAvailable !== undefined) {
    promptStockResolution(alertItemId, alertName, alertAvailable);
  }

  document.querySelectorAll(".clickable-cart-card").forEach((card) => {
    card.addEventListener("click", function (e) {
      const excludedTarget = e.target.closest(
        ".trigger-delete-btn, .quantity-selector, .item-actions"
      );
      if (excludedTarget) return;

      const productId = this.getAttribute("data-product-id");
      if (productId) {
        window.location.href = `/products/${productId}`;
      }
    });
  });

  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".trigger-delete-btn");
    if (removeBtn) {
      e.preventDefault();
      currentDeleteCartId = removeBtn.getAttribute("data-cart-id");
      if (deleteModal) deleteModal.classList.add("active");
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
    const isPlus = qtyBtn.classList.contains("plus");
    const qtyInput = qtyBtn.parentElement.querySelector("input");
    const currentVal = parseInt(qtyInput.value, 10) || 1;

    if (isPlus && currentVal >= 5) {
      return Swal.fire({
        icon: "warning",
        title: "Limit Reached",
        text: "Maximum quantity limit is 5 items per product.",
        confirmButtonColor: "#222",
        heightAuto: false,
      });
    }

    const action = isPlus ? "increase" : "decrease";
    const containerItemCard = qtyBtn.closest(".cart-item");

    try {
      const response = await fetch("/user/cart/change-quantity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ cartItemId, action }),
      });
      const data = await response.json();

      if (data.success) {
        if (data.action === "removed") {
          containerItemCard.style.opacity = "0";
          setTimeout(() => {
            containerItemCard.remove();
            Swal.fire({
              icon: "success",
              title: "Item Removed",
              text: data.message || "Item has been removed from your cart.",
              timer: 1200,
              showConfirmButton: false,
              heightAuto: false,
            }).then(() => {
              if (document.querySelectorAll(".cart-item").length === 0) {
                window.location.reload();
              } else {
                updateSummaryInvoiceUI(data.totalQuantity, data.subtotal);
              }
            });
          }, 300);
        } else {
          qtyInput.value = data.currentQuantity;
          updateSummaryInvoiceUI(data.totalQuantity, data.subtotal);
        }
      } else {
        Swal.fire({
          icon: "warning",
          title: "Stock Constraint",
          text: data.message,
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not update quantity.",
        confirmButtonColor: "#222",
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
            "x-csrf-token": csrfToken
          },
          body: JSON.stringify({ cartItemId: targetCartId }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Item Removed",
            text: data.message || "Item removed from your cart successfully.",
            timer: 1200,
            showConfirmButton: false,
            heightAuto: false,
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || "Failed to remove the product.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }
      } catch (error) {
        window.location.reload();
      }
    });
  }

  function updateSummaryInvoiceUI(totalQty, subtotalAmt) {
    const pageTitleElement = document.querySelector(".page-title");
    if (pageTitleElement) {
      pageTitleElement.innerText = `Shopping Cart (${totalQty} Items)`;
    }

    const labelRow = document.querySelector(
      ".summary-row:first-of-type span:first-child"
    );
    if (labelRow) {
      labelRow.innerHTML = `Cart Subtotal (${totalQty} items) <br><small>(Inclusive of 18% GST)</small>`;
    }

    const priceDisplay = document.querySelector(
      ".summary-row:first-of-type span:last-child"
    );
    if (priceDisplay) {
      priceDisplay.innerText = `₹${subtotalAmt.toLocaleString("en-IN")}`;
    }

    const totalPayable = Math.max(subtotalAmt - 1500, 0);
    const totalUI = document.querySelector(
      ".summary-row.total span:last-child"
    );
    if (totalUI) {
      totalUI.innerText = `₹${totalPayable.toLocaleString("en-IN")}`;
    }
  }

  const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");

  if (proceedCheckoutBtn) {
    proceedCheckoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const originalText = proceedCheckoutBtn.innerText;
      proceedCheckoutBtn.disabled = true;
      proceedCheckoutBtn.innerText = "Verifying Cart...";

      try {
        const response = await fetch("/user/cart/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
        });

        const data = await response.json();

        if (data.reason === "INCOMPLETE_PROFILE") {
          return Swal.fire({
            icon: "warning",
            title: "Complete Your Profile",
            text: data.message || "Complete your profile before making your first purchase",
            confirmButtonColor: "#222",
            heightAuto: false,
          }).then(() => {
            window.location.href = data.redirectUrl || "/user/profile";
          });
        }

        if (data.reason === "STOCK_EXCEEDED") {
          promptStockResolution(data.cartItemId, data.productName, data.availableStock);
          proceedCheckoutBtn.disabled = false;
          proceedCheckoutBtn.innerText = originalText;
          return;
        }

        if (data.success && data.redirectUrl) {
          if (data.warningNotice) {
            return Swal.fire({
              icon: "warning",
              title: "Notice",
              text: data.warningNotice,
              confirmButtonText: "OK",
              confirmButtonColor: "#222",
              heightAuto: false,
            }).then(() => {
              window.location.href = data.redirectUrl;
            });
          }

          window.location.href = data.redirectUrl;
          return;
        }

        Swal.fire({
          icon: "error",
          title: "Checkout Notice",
          text: data.message || "Unable to proceed to checkout.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
        proceedCheckoutBtn.disabled = false;
        proceedCheckoutBtn.innerText = originalText;

      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Could not verify your cart. Please try again.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
        proceedCheckoutBtn.disabled = false;
        proceedCheckoutBtn.innerText = originalText;
      }
    });
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