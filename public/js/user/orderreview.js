document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  const placeOrderBtn = document.getElementById("placeOrderBtn");
  if (placeOrderBtn) {
    async function submitOrderPlacement(stockResolution = null) {
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';

      try {
        const response = await fetch("/user/checkout/order/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ stockResolution }),
        });

        const data = await response.json();

        if (data.reason === "INVALID_COUPON") {
          return Swal.fire({
            icon: "warning",
            title: "Coupon Error",
            text: data.message || "The applied coupon is no longer valid for this purchase.",
            confirmButtonText: "Return to Cart",
            confirmButtonColor: "#222",
            heightAuto: false,
            allowOutsideClick: false,
          }).then(() => {
            window.location.href = "/user/cart";
          });
        }

        if (data.reason === "STOCK_EXCEEDED") {
          const itemLabel = data.productName ? `<b>${data.productName}</b>` : "This product variant";
          Swal.fire({
            icon: "warning",
            title: "Limited Stock Available",
            html: `${itemLabel} has only <b>${data.availableStock}</b> quantity available.<br><br>Do you want to proceed with this quantity or remove the item from the cart?`,
            showCancelButton: true,
            confirmButtonText: "Proceed",
            cancelButtonText: "Remove",
            confirmButtonColor: "#222",
            cancelButtonColor: "#8b0000",
            heightAuto: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then((res) => {
            if (res.isConfirmed) {
              submitOrderPlacement({
                variantId: data.variantId,
                action: "set",
                targetQuantity: data.availableStock,
              });
            } else if (res.dismiss === Swal.DismissReason.cancel) {
              submitOrderPlacement({
                variantId: data.variantId,
                action: "remove",
              });
            }
          });
          return;
        }

        if (data.success && data.redirectUrl) {
          if (data.warningNotice) {
            return Swal.fire({
              icon: "warning",
              title: "Items Excluded",
              text: data.warningNotice,
              confirmButtonText: "OK",
              confirmButtonColor: "#222",
              heightAuto: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
            }).then(() => {
              window.location.href = data.redirectUrl;
            });
          }

          window.location.href = data.redirectUrl;
          return;
        }

        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }

        Swal.fire({
          icon: "error",
          title: "Order Failed",
          text: data.message || "Could not finalize your order.",
          confirmButtonColor: "#8b0000",
          heightAuto: false,
        });

      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to communicate with the server. Please try again.",
          confirmButtonColor: "#8b0000",
          heightAuto: false,
        });
      } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML =
          'Place Order <i class="fa-solid fa-chevron-right"></i>';
      }
    }

    placeOrderBtn.addEventListener("click", () => submitOrderPlacement());
  }
});