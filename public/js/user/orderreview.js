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

  const placeOrderBtn = document.getElementById("placeOrderBtn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
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
        });

        const data = await response.json();

        if (data.success && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          Swal.fire({
            icon: "error",
            title: "Order Failed",
            text: data.message || "Could not finalize your order.",
            confirmButtonColor: "#8b0000",
            heightAuto: false,
          });
          placeOrderBtn.disabled = false;
          placeOrderBtn.innerHTML =
            'Place Order <i class="fa-solid fa-chevron-right"></i>';
        }
      } catch (error) {
        console.error("Error placing order:", error);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to communicate with the server. Please try again.",
          confirmButtonColor: "#8b0000",
          heightAuto: false,
        });
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML =
          'Place Order <i class="fa-solid fa-chevron-right"></i>';
      }
    });
  }
});
