document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const errorMessage = params.get('error');

    if (errorMessage) {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: decodeURIComponent(errorMessage),
            confirmButtonColor: '#1a1a1a',
            heightAuto: false
        });
        window.history.replaceState(null, '', window.location.pathname);
    }

    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                this.classList.remove("fa-eye-slash");
                this.classList.add("fa-eye");
            } else {
                passwordInput.type = "password";
                this.classList.remove("fa-eye");
                this.classList.add("fa-eye-slash");
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('submitBtn');
            const csrfToken = document.getElementById('csrfToken')?.value || '';

            if (!email || !password) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Missing Details',
                    text: 'Please enter both your email address and account password.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Format',
                    text: 'Please enter a valid email address configuration.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Welcome Back!',
                        text: 'Login successful.',
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false,
                        scrollbarPadding: false
                    }).then(() => {
                        window.location.href = '/home'; 
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false,
                        scrollbarPadding: false
                    });
                }
            } catch (error) {
                console.error("Login Exception Error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Something went wrong on our end. Please try again.',
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