document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const passwordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-password');
        if (toggleBtn) {
            const targetId = toggleBtn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            if (targetInput && targetInput.type === "password") {
                targetInput.type = "text";
                toggleBtn.classList.remove("fa-eye-slash");
                toggleBtn.classList.add("fa-eye");
                toggleBtn.style.color = "#222";
            } else if (targetInput) {
                targetInput.type = "password";
                toggleBtn.classList.remove("fa-eye");
                toggleBtn.classList.add("fa-eye-slash");
                toggleBtn.style.color = "#888";
            }
        }
    });

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
        clearError('new-password', 'passwordError');
        clearError('confirm-password', 'confirmPasswordError');
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => clearError('new-password', 'passwordError'));
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => clearError('confirm-password', 'confirmPasswordError'));
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAllErrors();

            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            const submitBtn = document.getElementById('submitBtn');

            let isValid = true;

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
            if (!password) {
                showError('new-password', 'passwordError', 'Please enter a new password.');
                isValid = false;
            } else if (!passwordRegex.test(password)) {
                showError('new-password', 'passwordError', 'Must be 12+ chars with uppercase, lowercase, number, and special char (!, @, #, $).');
                isValid = false;
            }

            if (!confirmPassword) {
                showError('confirm-password', 'confirmPasswordError', 'Please confirm your new password.');
                isValid = false;
            } else if (password !== confirmPassword) {
                showError('confirm-password', 'confirmPasswordError', 'Passwords do not match.');
                isValid = false;
            }

            if (!isValid) return;

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/reset-password', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: data.message,
                        timer: 2000,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = data.redirectUrl || '/user/login';
                    });
                } else {
                    showError('new-password', 'passwordError', data.message || 'Failed to update password.');
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#222', heightAuto: false });
                }
            } catch (error) {
                console.error("Password reset network process failure:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Server connection error.', heightAuto: false });
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});