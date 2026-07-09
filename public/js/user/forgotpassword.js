document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value.trim() : '';
            const submitBtn = document.getElementById('submitBtn');

            if (!email) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Missing Field',
                    text: 'Please enter your registered email address.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Email',
                    text: 'Please enter a valid email address configuration.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
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