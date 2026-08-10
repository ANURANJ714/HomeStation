document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.getElementById("adminCsrfToken")?.value || "";

    function updateDateTime() {
        const display = document.getElementById("datetimeDisplay");
        if (!display) return;

        const now = new Date();
        const options = { 
            weekday: "long", 
            year: "numeric", 
            month: "short", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit" 
        };
        display.textContent = now.toLocaleDateString("en-IN", options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const sidebar = document.getElementById("appSidebar");
    const closeSidebar = document.getElementById("closeSidebar");

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });

        if (closeSidebar) {
            closeSidebar.addEventListener("click", () => {
                sidebar.classList.remove("active");
            });
        }

        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 992) {
                if (
                    !sidebar.contains(e.target) &&
                    !hamburgerMenu.contains(e.target) &&
                    sidebar.classList.contains("active")
                ) {
                    sidebar.classList.remove("active");
                }
            }
        });
    }

    const adminLogoutForm = document.getElementById("adminLogoutForm");
    if (adminLogoutForm) {
        adminLogoutForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            try {
                const response = await fetch("/admin/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken
                    }
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "Logged Out",
                        text: data.message || "Redirecting to login window...",
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = data.redirectUrl || "/admin/login";
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Logout Failed",
                        text: data.message || "An error occurred while logging out.",
                        confirmButtonColor: "#222",
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Logout error:", error);
                window.location.href = "/admin/login";
            }
        });
    }
});