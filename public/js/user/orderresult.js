document.addEventListener("DOMContentLoaded", () => {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, document.title, window.location.href);

        window.addEventListener("popstate", () => {
            window.location.replace("/user/orders");
        });
    }

    const btnRetryPayment = document.getElementById("btnRetryPayment");

    if (btnRetryPayment) {
        btnRetryPayment.addEventListener("click", () => {
            const hiddenOrderId = document.getElementById("failedOrderId")?.value || "";
            const urlParams = new URLSearchParams(window.location.search);
            const queryOrderId = urlParams.get("orderId") || "";

            const targetOrderId = (hiddenOrderId || queryOrderId).trim().replace(/^#/, "");

            if (targetOrderId) {
                window.location.href = `/user/orders/detail/${encodeURIComponent(targetOrderId)}`;
            } else {
                window.location.href = "/user/orders";
            }
        });
    }
});