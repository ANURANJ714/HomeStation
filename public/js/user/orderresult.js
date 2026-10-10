document.addEventListener("DOMContentLoaded", () => {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, document.title, window.location.href);

        window.addEventListener("popstate", () => {
            window.location.replace("/user/orders");
        });
    }

    const btnRetryPayment = document.getElementById("btnRetryPayment");
    const csrfToken = document.getElementById("csrfToken")?.value || "";

    if (btnRetryPayment) {
        btnRetryPayment.addEventListener("click", async () => {
            const originalHtml = btnRetryPayment.innerHTML;
            btnRetryPayment.disabled = true;
            btnRetryPayment.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Retrying...';

            try {
                const response = await fetch("/user/checkout/order/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();

                if (data.success && data.isRazorpay) {
                    const rzpOptions = {
                        key: data.razorpayKeyId,
                        amount: data.amount,
                        currency: data.currency,
                        name: "HomeStation",
                        description: "Retry Order Payment",
                        order_id: data.razorpayOrderId,
                        prefill: {
                            name: data.customerName,
                            email: data.customerEmail,
                            contact: data.customerPhone
                        },
                        theme: {
                            color: "#1a1a1a"
                        },
                        handler: async function (razorpayResponse) {
                            Swal.fire({
                                title: "Verifying Payment...",
                                text: "Please wait while we confirm your transaction.",
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });

                            try {
                                const verifyRes = await fetch("/user/checkout/order/verify-payment", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "CSRF-Token": csrfToken
                                    },
                                    body: JSON.stringify(razorpayResponse)
                                });

                                const verifyData = await verifyRes.json();

                                if (verifyData.success) {
                                    window.location.href = verifyData.redirectUrl;
                                } else {
                                    Swal.fire({
                                        icon: "error",
                                        title: "Payment Verification Failed",
                                        text: verifyData.message || "Failed to verify transaction.",
                                        confirmButtonColor: "#222"
                                    });
                                    btnRetryPayment.disabled = false;
                                    btnRetryPayment.innerHTML = originalHtml;
                                }
                            } catch (err) {
                                Swal.fire({
                                    icon: "error",
                                    title: "Network Error",
                                    text: "Failed to connect to verification server.",
                                    confirmButtonColor: "#222"
                                });
                                btnRetryPayment.disabled = false;
                                btnRetryPayment.innerHTML = originalHtml;
                            }
                        },
                        modal: {
                            ondismiss: function () {
                                btnRetryPayment.disabled = false;
                                btnRetryPayment.innerHTML = originalHtml;
                            }
                        }
                    };

                    const rzp = new Razorpay(rzpOptions);
                    rzp.on("payment.failed", function (failResponse) {
                        Swal.fire({
                            icon: "error",
                            title: "Payment Incomplete",
                            text: failResponse.error?.description || "Payment attempt failed.",
                            confirmButtonColor: "#222"
                        });
                        btnRetryPayment.disabled = false;
                        btnRetryPayment.innerHTML = originalHtml;
                    });

                    rzp.open();
                    return;
                }

                if (data.success && data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                    return;
                }

                if (!data.success) {
                    if (data.reason === "INCOMPLETE_SESSION" || data.reason === "NO_ITEMS") {
                        Swal.fire({
                            icon: "warning",
                            title: "Session Expired",
                            text: data.message || "Your checkout session has expired. Redirecting to review...",
                            confirmButtonColor: "#222"
                        }).then(() => {
                            window.location.href = "/user/checkout/review";
                        });
                    } else if (data.reason === "INSUFFICIENT_WALLET_BALANCE") {
                        Swal.fire({
                            icon: "error",
                            title: "Insufficient Balance",
                            text: data.message,
                            showCancelButton: true,
                            confirmButtonText: "Add Money to Wallet",
                            cancelButtonText: "Change Payment Mode",
                            confirmButtonColor: "#222"
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/user/wallet";
                            } else {
                                window.location.href = "/user/checkout/review";
                            }
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Order Failed",
                            text: data.message || "Could not complete order.",
                            confirmButtonColor: "#222"
                        });
                    }
                }
            } catch (error) {
                console.error("Retry payment error:", error);
                Swal.fire({
                    icon: "error",
                    title: "Network Error",
                    text: "Unable to process payment retry. Please check your connection.",
                    confirmButtonColor: "#222"
                });
            } finally {
                btnRetryPayment.disabled = false;
                btnRetryPayment.innerHTML = originalHtml;
            }
        });
    }
});