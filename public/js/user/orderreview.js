document.addEventListener("DOMContentLoaded", () => {
  const csrfToken = document.getElementById("csrfToken")?.value || "";

  const placeOrderBtn = document.getElementById("placeOrderBtn");
  if (placeOrderBtn) {
    function showOrderSuccessModalAndRedirect(redirectUrl) {
      Swal.fire({
        icon: "success",
        title: "Completing the order...",
        text: "Please wait while we finalize your order.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        window.location.href = redirectUrl;
      });
    }

    function showOrderFailureModalAndRedirect(message) {
      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text: message || "Payment or order processing failed.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        window.location.href = "/user/checkout/failure";
      });
    }

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

        if (data.reason === "INSUFFICIENT_WALLET_BALANCE") {
          return showOrderFailureModalAndRedirect(
            data.message || "Insufficient wallet balance."
          );
        }

        if (data.reason === "INVALID_COUPON") {
          placeOrderBtn.disabled = false;
          placeOrderBtn.innerHTML = 'Place Order <i class="fa-solid fa-chevron-right"></i>';

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
          placeOrderBtn.disabled = false;
          placeOrderBtn.innerHTML = 'Place Order <i class="fa-solid fa-chevron-right"></i>';

          const itemLabel = data.productName ? `<b>${data.productName}</b>` : "This product variant";
          return Swal.fire({
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
        }

        if (data.success && data.isRazorpay) {
          const options = {
            key: data.razorpayKeyId,
            amount: data.amount,
            currency: data.currency || "INR",
            name: "HomeStation",
            description: "Premium Mattress Purchase",
            image: "https://res.cloudinary.com/dz7fuqwnr/image/upload/v1778395481/WhatsApp_Image_2026-05-10_at_12.12.36_nra5vk.jpg",
            order_id: data.razorpayOrderId,
            prefill: {
              name: data.customerName,
              email: data.customerEmail,
              contact: data.customerPhone,
            },
            theme: {
              color: "#8b0000",
            },
            modal: {
              ondismiss: function () {
                showOrderFailureModalAndRedirect("Payment was cancelled or dismissed.");
              },
            },
            handler: async function (paymentResponse) {
              try {
                placeOrderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirming Payment...';
                
                const verifyRes = await fetch("/user/checkout/order/verify-payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "CSRF-Token": csrfToken,
                    "x-csrf-token": csrfToken,
                  },
                  body: JSON.stringify({
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                  }),
                });

                const verifyData = await verifyRes.json();

                if (verifyData.success && verifyData.redirectUrl) {
                  showOrderSuccessModalAndRedirect(verifyData.redirectUrl);
                } else {
                  showOrderFailureModalAndRedirect(verifyData.message || "Payment verification failed.");
                }
              } catch (err) {
                showOrderFailureModalAndRedirect("Could not verify payment with the server.");
              }
            },
          };

          const rzp = new Razorpay(options);
          rzp.on("payment.failed", function (failResponse) {
            const errorMsg = failResponse.error?.description || "Payment gateway processing failed.";
            showOrderFailureModalAndRedirect(errorMsg);
          });
          rzp.open();
          return;
        }

        if (data.success && data.redirectUrl) {
          showOrderSuccessModalAndRedirect(data.redirectUrl);
          return;
        }

        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = 'Place Order <i class="fa-solid fa-chevron-right"></i>';

        Swal.fire({
          icon: "error",
          title: "Order Failed",
          text: data.message || "Could not finalize your order.",
          confirmButtonColor: "#8b0000",
          heightAuto: false,
        });

      } catch (error) {
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = 'Place Order <i class="fa-solid fa-chevron-right"></i>';

        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to communicate with the server. Please try again.",
          confirmButtonColor: "#8b0000",
          heightAuto: false,
        });
      }
    }

    placeOrderBtn.addEventListener("click", () => submitOrderPlacement());
  }
});