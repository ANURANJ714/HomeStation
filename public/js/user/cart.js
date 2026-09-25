document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";
  const deleteModal = document.getElementById("deleteModal");
  const closeModalBtn = document.getElementById("closeModal");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  let currentDeleteCartId = null;

  const appliedCouponState = {
    code: null,
    discountAmount: 0,
  };

  function getDeepCopiedBaseTotal() {
    const totalEl = document.getElementById("totalPayableAmount");
    const rawVal = totalEl ? Number(totalEl.dataset.baseTotal || 0) : 0;
    return Number(JSON.parse(JSON.stringify(rawVal)));
  }

  function calculateDeliveryCharge(subtotal) {
    if (subtotal <= 0) return 0;
    return subtotal <= 500 ? 100 : 0;
  }

  const couponCodeInput = document.getElementById("couponCodeInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");
  const couponDiscountValue = document.getElementById("couponDiscountValue");
  const appliedCouponBadge = document.getElementById("appliedCouponBadge");

  function resetCouponButtonToDefault() {
    if (applyCouponBtn) {
      applyCouponBtn.innerText = "Apply";
      applyCouponBtn.classList.remove("btn-remove-coupon");
      applyCouponBtn.disabled = false;
    }
    if (couponCodeInput) {
      couponCodeInput.readOnly = false;
      couponCodeInput.value = "";
    }
    if (appliedCouponBadge) {
      appliedCouponBadge.innerText = "";
      appliedCouponBadge.classList.add("d-none");
    }
  }

  function switchCouponButtonToRemoveMode(code) {
    if (applyCouponBtn) {
      applyCouponBtn.innerText = "Remove";
      applyCouponBtn.classList.add("btn-remove-coupon");
      applyCouponBtn.disabled = false;
    }
    if (couponCodeInput) {
      couponCodeInput.value = code;
      couponCodeInput.readOnly = true;
    }
    if (appliedCouponBadge) {
      appliedCouponBadge.innerText = code;
      appliedCouponBadge.classList.remove("d-none");
    }
  }

  function removeAppliedCoupon(notify = true) {
    appliedCouponState.code = null;
    appliedCouponState.discountAmount = 0;

    const baseTotalSnapshot = getDeepCopiedBaseTotal();

    if (couponDiscountValue) {
      couponDiscountValue.innerText = "-₹0";
    }

    resetCouponButtonToDefault();

    const totalUI = document.getElementById("totalPayableAmount");
    if (totalUI) {
      totalUI.innerText = `₹${baseTotalSnapshot.toLocaleString("en-IN")}`;
    }

    if (notify) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Coupon removed",
        showConfirmButton: false,
        timer: 1200,
      });
    }
  }

  async function applyCoupon() {
    const code = couponCodeInput
      ? couponCodeInput.value.trim().toUpperCase()
      : "";

    if (!code) {
      return Swal.fire({
        icon: "warning",
        title: "Empty Code",
        text: "Please enter or select a coupon code.",
        confirmButtonColor: "#222",
        heightAuto: false,
      });
    }

    const baseTotalSnapshot = getDeepCopiedBaseTotal();

    if (baseTotalSnapshot <= 0) {
      return Swal.fire({
        icon: "warning",
        title: "Empty Cart",
        text: "Add items to your cart before applying coupons.",
        confirmButtonColor: "#222",
        heightAuto: false,
      });
    }

    applyCouponBtn.disabled = true;
    applyCouponBtn.innerText = "Applying...";

    try {
      const response = await fetch("/user/cart/apply-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          couponCode: code,
          baseTotal: baseTotalSnapshot,
        }),
      });

      const data = await response.json();

      if (data.success) {
        appliedCouponState.code = data.couponCode;
        appliedCouponState.discountAmount = data.discountAmount;

        if (couponDiscountValue) {
          couponDiscountValue.innerText = `-₹${data.discountAmount.toLocaleString("en-IN")}`;
        }

        switchCouponButtonToRemoveMode(data.couponCode);

        const totalUI = document.getElementById("totalPayableAmount");
        if (totalUI) {
          totalUI.innerText = `₹${data.newTotalPayable.toLocaleString("en-IN")}`;
        }

        hideCouponsModal();

        Swal.fire({
          icon: "success",
          title: "Coupon Applied!",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
          heightAuto: false,
        });
      } else {
        resetCouponButtonToDefault();
        Swal.fire({
          icon: "error",
          title: "Cannot Apply Coupon",
          text: data.message || "Failed to apply coupon.",
          confirmButtonColor: "#222",
          heightAuto: false,
        });
      }
    } catch (err) {
      resetCouponButtonToDefault();
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Unable to reach server. Please try again.",
        confirmButtonColor: "#222",
        heightAuto: false,
      });
    }
  }

  if (applyCouponBtn) {
    applyCouponBtn.addEventListener("click", () => {
      if (appliedCouponState.code) {
        removeAppliedCoupon(true);
      } else {
        applyCoupon();
      }
    });
  }

  if (couponCodeInput) {
    couponCodeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!appliedCouponState.code) {
          applyCoupon();
        }
      }
    });
  }

  function updateSummaryInvoiceUI(totalQty, subtotalAmt) {
    const pageTitleElement = document.querySelector(".page-title");
    if (pageTitleElement) {
      pageTitleElement.innerText = `Shopping Cart (${totalQty} Items)`;
    }

    const labelRow = document.querySelector(
      ".summary-row:first-of-type span:first-child",
    );
    if (labelRow) {
      labelRow.innerHTML = `Cart Subtotal (${totalQty} items) <br><small>(Inclusive of 18% GST)</small>`;
    }

    const priceDisplay = document.querySelector(
      ".summary-row:first-of-type span:last-child",
    );
    if (priceDisplay) {
      priceDisplay.innerText = `₹${subtotalAmt.toLocaleString("en-IN")}`;
    }

    const deliveryCharges = calculateDeliveryCharge(subtotalAmt);
    const deliveryDisplay = document.getElementById("deliveryChargeValue");
    if (deliveryDisplay) {
      if (deliveryCharges === 0) {
        deliveryDisplay.className = "free-text";
        deliveryDisplay.innerText = "FREE";
      } else {
        deliveryDisplay.className = "";
        deliveryDisplay.innerText = `₹${deliveryCharges.toLocaleString("en-IN")}`;
      }
    }

    const initialBaseTotal = subtotalAmt + deliveryCharges;
    const baseTotalSnapshot = Number(
      JSON.parse(JSON.stringify(initialBaseTotal)),
    );

    const totalUI = document.getElementById("totalPayableAmount");
    if (totalUI) {
      totalUI.dataset.baseTotal = baseTotalSnapshot;

      if (appliedCouponState.code) {
        removeAppliedCoupon(false);
      }

      const finalPayable = Math.max(
        0,
        baseTotalSnapshot - appliedCouponState.discountAmount,
      );
      totalUI.innerText = `₹${finalPayable.toLocaleString("en-IN")}`;
    }
  }

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
    const itemLabel = productName
      ? `<b>${productName}</b>`
      : "This product variant";

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
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
              "x-csrf-token": csrfToken,
            },
            body: JSON.stringify({
              cartItemId: cartItemId,
              action: "set",
              targetQuantity: availableStock,
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
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
              "x-csrf-token": csrfToken,
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

  const couponsModal = document.getElementById("couponsModal");
  const openCouponsModalBtn = document.getElementById("openCouponsModalBtn");
  const closeCouponsModalBtn = document.getElementById("closeCouponsModalBtn");

  function showCouponsModal() {
    if (couponsModal) {
      couponsModal.classList.add("active");
      couponsModal.style.display = "flex";
    }
  }

  function hideCouponsModal() {
    if (couponsModal) {
      couponsModal.classList.remove("active");
      couponsModal.style.display = "none";
    }
  }

  if (openCouponsModalBtn) {
    openCouponsModalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showCouponsModal();
    });
  }

  if (closeCouponsModalBtn) {
    closeCouponsModalBtn.addEventListener("click", hideCouponsModal);
  }

  window.addEventListener("click", (e) => {
    if (e.target === couponsModal) {
      hideCouponsModal();
    }
  });

  document.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest(".copy-coupon-trigger");
    if (!copyBtn) return;

    const code = copyBtn.dataset.code;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      if (couponCodeInput && !appliedCouponState.code) {
        couponCodeInput.value = code;
      }

      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
      }, 2000);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Coupon ${code} copied!`,
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "info",
        title: "Coupon Code",
        text: `Please copy manually: ${code}`,
        confirmButtonColor: "#222",
      });
    }
  });

  const alertItemId = document.getElementById("stockAlertItemId")?.value;
  const alertAvailable = document.getElementById("stockAlertAvailable")?.value;
  const alertName = document.getElementById("stockAlertName")?.value;

  if (alertItemId && alertAvailable !== undefined) {
    promptStockResolution(alertItemId, alertName, alertAvailable);
  }

  document.querySelectorAll(".clickable-cart-card").forEach((card) => {
    card.addEventListener("click", function (e) {
      const excludedTarget = e.target.closest(
        ".trigger-delete-btn, .quantity-selector, .item-actions",
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
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
          "x-csrf-token": csrfToken,
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
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
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
          body: JSON.stringify({
            appliedCouponCode: appliedCouponState.code,
            appliedCouponDiscount: appliedCouponState.discountAmount,
          }),
        });

        const data = await response.json();

        if (data.reason === "INVALID_COUPON") {
          removeAppliedCoupon(false);
          proceedCheckoutBtn.disabled = false;
          proceedCheckoutBtn.innerText = originalText;

          return Swal.fire({
            icon: "warning",
            title: "Coupon Error",
            text: data.message || "The applied coupon is no longer valid.",
            confirmButtonColor: "#222",
            heightAuto: false,
          });
        }

        if (data.reason === "INCOMPLETE_PROFILE") {
          return Swal.fire({
            icon: "warning",
            title: "Complete Your Profile",
            text:
              data.message ||
              "Complete your profile before making your first purchase",
            confirmButtonColor: "#222",
            heightAuto: false,
          }).then(() => {
            window.location.href = data.redirectUrl || "/user/profile";
          });
        }

        if (data.reason === "STOCK_EXCEEDED") {
          promptStockResolution(
            data.cartItemId,
            data.productName,
            data.availableStock,
          );
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