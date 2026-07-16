document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    function performSearch() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    const contactForm = document.getElementById("userContactInquiryForm");
    if (contactForm) {
        contactForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            const csrfToken = document.getElementById("csrfToken")?.value || "";
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const subject = document.getElementById("subject").value;
            const message = document.getElementById("message").value.trim();

            if (!name || !email || !subject || !message) {
                return Swal.fire({
                    icon: "error",
                    title: "Missing Information",
                    text: "Please fully populate all fields and select a valid inquiry subject from our option listing.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }

            try {
                const response = await fetch("/contact/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "csrf-token": csrfToken
                    },
                    body: JSON.stringify({ name, email, subjectId: subject, message })
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/user/login";
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "Inquiry Raised!",
                        text: data.message,
                        confirmButtonColor: "#222",
                        heightAuto: false
                    }).then(() => {
                        const msgField = document.getElementById("message");
                        const subField = document.getElementById("subject");
                        if (msgField) msgField.value = "";
                        if (subField) subField.value = "";
                    });
                } else {
                    Swal.fire({
                        icon: "warning",
                        title: "Notice",
                        text: data.message,
                        confirmButtonColor: "#222",
                        heightAuto: false
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Network Error",
                    text: "Could not establish an active backend server communication tunnel.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }
        });
    }
});