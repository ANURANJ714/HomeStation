document.addEventListener("DOMContentLoaded", () => {
    if (window.history && window.history.pushState) {
        window.history.pushState(null, document.title, window.location.href);

        window.addEventListener("popstate", () => {
            window.location.replace("/user/orders");
        });
    }
});