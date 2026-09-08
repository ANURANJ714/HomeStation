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

    function clearErrors() {
        document.querySelectorAll(".field-error-msg").forEach(el => el.textContent = "");
        document.querySelectorAll(".contact-form input, .contact-form select, .contact-form textarea").forEach(el => el.classList.remove("input-error"));
    }

    document.querySelectorAll(".contact-form input, .contact-form select, .contact-form textarea").forEach(el => {
        el.addEventListener("input", () => {
            el.classList.remove("input-error");
            const err = el.parentElement.querySelector(".field-error-msg");
            if (err) err.textContent = "";
        });
    });

    const contactForm = document.getElementById("userContactInquiryForm");
    if (contactForm) {
        contactForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            clearErrors();

            const csrfToken = document.getElementById("csrfToken")?.value || "";
            const nameInput = document.getElementById("name");
            const emailInput = document.getElementById("email");
            const subjectInput = document.getElementById("subject");
            const messageInput = document.getElementById("message");

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const subject = subjectInput.value;
            const message = messageInput.value.trim();

            let hasError = false;

            if (!name) {
                document.getElementById("nameError").textContent = "Name is required.";
                nameInput.classList.add("input-error");
                hasError = true;
            }

            if (!email) {
                document.getElementById("emailError").textContent = "Email address is required.";
                emailInput.classList.add("input-error");
                hasError = true;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                document.getElementById("emailError").textContent = "Please enter a valid email address.";
                emailInput.classList.add("input-error");
                hasError = true;
            }

            if (!subject) {
                document.getElementById("subjectError").textContent = "Please select a subject.";
                subjectInput.classList.add("input-error");
                hasError = true;
            }

            if (!message) {
                document.getElementById("messageError").textContent = "Message content is required.";
                messageInput.classList.add("input-error");
                hasError = true;
            } else if (message.length < 10) {
                document.getElementById("messageError").textContent = "Message must be at least 10 characters long.";
                messageInput.classList.add("input-error");
                hasError = true;
            }

            if (hasError) return;

            try {
                const response = await fetch("/contact/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "csrf-token": csrfToken,
                        "CSRF-Token": csrfToken
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
                        if (messageInput) messageInput.value = "";
                        if (subjectInput) subjectInput.value = "";
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
                    text: "Could not establish server communication.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }
        });
    }
});