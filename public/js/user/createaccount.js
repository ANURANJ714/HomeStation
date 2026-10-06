document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';

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

    function showError(fieldId, errorId, message) {
        const inputField = document.getElementById(fieldId);
        const errorEl = document.getElementById(errorId);
        const inputContainer = inputField?.closest('.input-container');

        if (errorEl) {
            errorEl.innerText = message;
            errorEl.classList.add('active');
        }
        if (inputContainer) {
            inputContainer.classList.add('has-error');
        }
    }

    function clearError(fieldId, errorId) {
        const inputField = document.getElementById(fieldId);
        const errorEl = document.getElementById(errorId);
        const inputContainer = inputField?.closest('.input-container');

        if (errorEl) {
            errorEl.innerText = '';
            errorEl.classList.remove('active');
        }
        if (inputContainer) {
            inputContainer.classList.remove('has-error');
        }
    }

    function clearAllErrors() {
        clearError('name', 'nameError');
        clearError('email', 'emailError');
        clearError('phone', 'phoneError');
        clearError('password', 'passwordError');
        clearError('confirm-password', 'confirmPasswordError');
        clearError('referredBy', 'referredByError');
    }

    ['name', 'email', 'phone', 'password', 'confirm-password', 'referredBy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const errorId = id === 'confirm-password' ? 'confirmPasswordError' : `${id}Error`;
                clearError(id, errorId);
            });
        }
    });

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAllErrors();

            const fullName = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const referredBy = document.getElementById('referredBy').value.trim();
            const submitBtn = document.getElementById('submitBtn');

            let isValid = true;

            const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
            if (!fullName) {
                showError('name', 'nameError', 'Please enter your full name.');
                isValid = false;
            } else if (!nameRegex.test(fullName)) {
                showError('name', 'nameError', 'Name can only contain letters and single spaces.');
                isValid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                showError('email', 'emailError', 'Please enter your email address.');
                isValid = false;
            } else if (!emailRegex.test(email)) {
                showError('email', 'emailError', 'Please enter a valid email address.');
                isValid = false;
            }

            const phoneRegex = /^[0-9]{10}$/;
            if (!phone) {
                showError('phone', 'phoneError', 'Please enter your phone number.');
                isValid = false;
            } else if (!phoneRegex.test(phone)) {
                showError('phone', 'phoneError', 'Please enter a valid 10-digit mobile number.');
                isValid = false;
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
            if (!password) {
                showError('password', 'passwordError', 'Please enter a password.');
                isValid = false;
            } else if (!passwordRegex.test(password)) {
                showError('password', 'passwordError', 'Must be 12+ chars with uppercase, lowercase, number, and special char (!, @, #, $).');
                isValid = false;
            }

            if (!confirmPassword) {
                showError('confirm-password', 'confirmPasswordError', 'Please confirm your password.');
                isValid = false;
            } else if (password !== confirmPassword) {
                showError('confirm-password', 'confirmPasswordError', 'Passwords do not match.');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ 
                        fullName, 
                        email, 
                        phone, 
                        password, 
                        confirmPassword,
                        referredBy
                    })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = '/user/verify-otp';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Registration Failed',
                        text: data.message || 'Failed to complete registration.',
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