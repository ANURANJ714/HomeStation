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

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Submitting...";
            }

            try {
                const response = await fetch("/contact/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "CSRF-Token": csrfToken,
                        "x-csrf-token": csrfToken
                    },
                    body: JSON.stringify({ name, email, subjectId: subject, message })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "Inquiry Raised!",
                        text: data.message,
                        confirmButtonColor: "#222",
                        heightAuto: false
                    }).then(() => {
                        if (messageInput) messageInput.value = "";
                        if (subjectInput) subjectInput.value = "";
                        const isLockedName = nameInput.classList.contains("locked-input");
                        const isLockedEmail = emailInput.classList.contains("locked-input");
                        if (!isLockedName) nameInput.value = "";
                        if (!isLockedEmail) emailInput.value = "";
                    });
                } else {
                    Swal.fire({
                        icon: "warning",
                        title: data.isCsrfError ? "Session Expired" : "Notice",
                        text: data.message || "Failed to submit inquiry. Please try again.",
                        confirmButtonColor: "#222",
                        heightAuto: false
                    }).then(() => {
                        if (data.isCsrfError) window.location.reload();
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Network Error",
                    text: "Could not establish server communication. Please refresh and try again.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Send Message";
                }
            }
        });
    }
});