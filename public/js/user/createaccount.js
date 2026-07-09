document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken').value;

    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                this.classList.remove("fa-eye-slash");
                this.classList.add("fa-eye");
                this.style.color = "#222";
            } else {
                passwordInput.type = "password";
                this.classList.remove("fa-eye");
                this.classList.add("fa-eye-slash");
                this.style.color = "#888";
            }
        });
    });

    const loginRedirectBtn = document.getElementById('loginRedirectBtn');
    if (loginRedirectBtn) {
        loginRedirectBtn.addEventListener('click', () => {
            window.location.href = '/user/login';
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const submitBtn = document.getElementById('submitBtn');

            if (!fullName || !email || !phone || !password || !confirmPassword) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Missing Information',
                    text: 'Please fill out all fields before creating an account.',
                    confirmButtonColor: '#222',
                    heightAuto: false,
                    scrollbarPadding: false
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Email',
                    text: 'Please enter a valid email address.',
                    confirmButtonColor: '#222',
                    heightAuto: false,
                });
            }

            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Phone Number',
                    text: 'Please enter a valid 10-digit mobile number.',
                    confirmButtonColor: '#222',
                    heightAuto: false,
                });
            }

            if (password !== confirmPassword) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Check Passwords',
                    text: 'Your passwords do not match!',
                    confirmButtonColor: '#222',
                    heightAuto: false,
                    scrollbarPadding: false
                });
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify({ fullName, email, phone, password, confirmPassword })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = '/user/verify-otp';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Registration Failed',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false,
                        scrollbarPadding: false
                    });
                }
            } catch (error) {
                console.error("Registration submission exception:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Server Error',
                    text: 'Could not connect to the server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false,
                    scrollbarPadding: false
                });
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});