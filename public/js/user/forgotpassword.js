document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');

    function showError(message) {
        if (emailError) {
            emailError.innerText = message;
            emailError.classList.add('active');
        }
        const container = emailInput?.closest('.input-container');
        if (container) {
            container.classList.add('has-error');
        }
    }

    function clearError() {
        if (emailError) {
            emailError.innerText = '';
            emailError.classList.remove('active');
        }
        const container = emailInput?.closest('.input-container');
        if (container) {
            container.classList.remove('has-error');
        }
    }

    if (emailInput) {
        emailInput.addEventListener('input', clearError);
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const email = emailInput ? emailInput.value.trim() : '';
            const submitBtn = document.getElementById('submitBtn');

            if (!email) {
                showError('Please enter your registered email address.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address.');
                return;
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/forgot-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = '/user/verify-otp';
                } else if (data.isExistingUser === false) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Account Not Found',
                        text: data.message,
                        timer: 2500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = '/user/register'; 
                    });
                } else {
                    showError(data.message || 'Unable to process your request.');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Forgot password process exception:", error);
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Error', 
                    text: 'A network error occurred. Please check your connection.', 
                    confirmButtonColor: '#1a1a1a', 
                    heightAuto: false 
                });
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});