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
    const emailInput = document.getElementById('email');

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

    function showError(fieldId, errorId, message) {
        const inputField = document.getElementById(fieldId);
        const errorEl = document.getElementById(errorId);
        const container = inputField?.closest('.input-container');

        if (errorEl) {
            errorEl.innerText = message;
            errorEl.classList.add('active');
        }
        if (container) {
            container.classList.add('has-error');
        }
    }

    function clearError(fieldId, errorId) {
        const inputField = document.getElementById(fieldId);
        const errorEl = document.getElementById(errorId);
        const container = inputField?.closest('.input-container');

        if (errorEl) {
            errorEl.innerText = '';
            errorEl.classList.remove('active');
        }
        if (container) {
            container.classList.remove('has-error');
        }
    }

    function clearAllErrors() {
        clearError('email', 'emailError');
        clearError('password', 'passwordError');
    }

    if (emailInput) {
        emailInput.addEventListener('input', () => clearError('email', 'emailError'));
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', () => clearError('password', 'passwordError'));
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAllErrors();

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const submitBtn = document.getElementById('submitBtn');
            const csrfToken = document.getElementById('csrfToken')?.value || '';

            let isValid = true;

            if (!email) {
                showError('email', 'emailError', 'Please enter your email address.');
                isValid = false;
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showError('email', 'emailError', 'Please enter a valid email address.');
                    isValid = false;
                }
            }

            if (!password) {
                showError('password', 'passwordError', 'Please enter your account password.');
                isValid = false;
            }

            if (!isValid) return;

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
                        window.location.href = data.redirectUrl || '/home'; 
                    });
                } else {
                    if (data.message && data.message.toLowerCase().includes('password')) {
                        showError('password', 'passwordError', data.message);
                    } else if (data.message && data.message.toLowerCase().includes('email')) {
                        showError('email', 'emailError', data.message);
                    }

                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: data.message || 'Invalid credentials provided.',
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