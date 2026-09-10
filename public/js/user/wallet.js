document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("csrfToken")?.value || "";

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

    const quickBtns = document.querySelectorAll(".quick-btn");
    const amountInput = document.getElementById("manualAmount");

    quickBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (amountInput) {
                amountInput.value = btn.dataset.value;
            }
        });
    });

    const addMoneyTriggerBtn = document.getElementById("addMoneyTriggerBtn");
    if (addMoneyTriggerBtn) {
        addMoneyTriggerBtn.addEventListener("click", async () => {
            const enteredVal = parseFloat(amountInput.value);

            if (isNaN(enteredVal) || enteredVal <= 0) {
                return Swal.fire({
                    icon: "warning",
                    title: "Invalid Amount",
                    text: "Please enter an amount greater than zero.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }

            if (enteredVal > 50000) {
                return Swal.fire({
                    icon: "warning",
                    title: "Limit Exceeded",
                    text: "You cannot add more than ₹50,000 in a single transaction.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }

            const originalBtnText = addMoneyTriggerBtn.innerText;
            addMoneyTriggerBtn.disabled = true;
            addMoneyTriggerBtn.innerText = "Connecting...";

            try {
                const orderRes = await fetch("/user/wallet/add-money", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken
                    },
                    body: JSON.stringify({ amount: enteredVal })
                });

                const orderData = await orderRes.json();

                if (!orderData.success) {
                    addMoneyTriggerBtn.disabled = false;
                    addMoneyTriggerBtn.innerText = originalBtnText;
                    return Swal.fire({
                        icon: "error",
                        title: "Notice",
                        text: orderData.message || "Failed to create payment order.",
                        confirmButtonColor: "#222",
                        heightAuto: false
                    });
                }

                const options = {
                    key: orderData.order.key,
                    amount: orderData.order.amount,
                    currency: orderData.order.currency,
                    name: "HomeStation",
                    description: "Wallet Recharge",
                    image: "https://res.cloudinary.com/dz7fuqwnr/image/upload/v1778395481/WhatsApp_Image_2026-05-10_at_12.12.36_nra5vk.jpg",
                    order_id: orderData.order.orderId,
                    handler: async function (response) {
                        try {
                            Swal.fire({
                                title: "Verifying Deposit...",
                                text: "Please wait while we confirm your transaction.",
                                allowOutsideClick: false,
                                heightAuto: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });

                            const verifyRes = await fetch("/user/wallet/verify-payment", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "CSRF-Token": csrfToken,
                                    "x-csrf-token": csrfToken
                                },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    amount: enteredVal
                                })
                            });

                            const verifyData = await verifyRes.json();

                            if (verifyData.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Recharged!",
                                    text: verifyData.message,
                                    timer: 1500,
                                    showConfirmButton: false,
                                    heightAuto: false
                                }).then(() => {
                                    window.location.reload();
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Verification Failed",
                                    text: verifyData.message || "Unable to verify payment signature.",
                                    confirmButtonColor: "#222",
                                    heightAuto: false
                                });
                            }
                        } catch (verErr) {
                            console.error("Signature verification error:", verErr);
                            Swal.fire({
                                icon: "error",
                                title: "Network Error",
                                text: "Failed to verify transaction with server.",
                                confirmButtonColor: "#222",
                                heightAuto: false
                            });
                        }
                    },
                    prefill: {
                        name: orderData.user.name,
                        email: orderData.user.email,
                        contact: orderData.user.phone
                    },
                    theme: {
                        color: "#222222"
                    },
                    modal: {
                        ondismiss: function () {
                            addMoneyTriggerBtn.disabled = false;
                            addMoneyTriggerBtn.innerText = originalBtnText;
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();
                addMoneyTriggerBtn.disabled = false;
                addMoneyTriggerBtn.innerText = originalBtnText;

            } catch (err) {
                console.error("Add money initial request error:", err);
                addMoneyTriggerBtn.disabled = false;
                addMoneyTriggerBtn.innerText = originalBtnText;

                Swal.fire({
                    icon: "error",
                    title: "Gateway Error",
                    text: "Could not establish connection with Razorpay.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }
        });
    }

    const logoutForm = document.getElementById("logoutForm");
    if (logoutForm) {
        logoutForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const csrf =
                logoutForm.querySelector('input[name="_csrf"]')?.value ||
                document.getElementById("csrfToken")?.value;

            try {
                const response = await fetch("/user/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrf,
                        "x-csrf-token": csrf
                    }
                });

                const data = await response.json();

                if (data.success && data.redirectUrl) {
                    Swal.fire({
                        icon: "success",
                        title: "Goodbye!",
                        text: data.message || "Logged out successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = data.redirectUrl;
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Logout Failed",
                        text: data.message || "Something went wrong.",
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Logout fetch error:", error);
            }
        });
    }
});