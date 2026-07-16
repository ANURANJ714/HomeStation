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
        contactForm.addEventListener("submit", function(e) {
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const subject = document.getElementById("subject").value;
            const message = document.getElementById("message").value.trim();

            if (!name || !email || !subject || !message) {
                e.preventDefault();
                
                Swal.fire({
                    icon: "error",
                    title: "Missing Information",
                    text: "Please fully populate all fields and select a valid inquiry subject from our option listing.",
                    confirmButtonColor: "#222",
                    heightAuto: false
                });
            }
        });
    }
});