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
        addMoneyTriggerBtn.addEventListener("click", () => {
            const val = parseFloat(amountInput.value);
            if (isNaN(val) || val <= 0) {
                return Swal.fire({
                    icon: "warning",
                    title: "Invalid Amount",
                    text: "Please enter a valid amount greater than zero.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }

            Swal.fire({
                icon: "info",
                title: "Ready to Add Money",
                text: `Payment gateway integration for adding ₹${val.toLocaleString("en-IN")} to your wallet is next.`,
                confirmButtonColor: "#222",
                heightAuto: false
            });
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