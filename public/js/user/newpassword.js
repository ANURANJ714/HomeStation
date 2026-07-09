document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-password');
        if (toggleBtn) {
            const targetId = toggleBtn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput && passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleBtn.classList.remove("fa-eye-slash");
                toggleBtn.classList.add("fa-eye");
                toggleBtn.style.color = "#222";
            } else if (passwordInput) {
                passwordInput.type = "password";
                toggleBtn.classList.remove("fa-eye");
                toggleBtn.classList.add("fa-eye-slash");
                toggleBtn.style.color = "#888";
            }
        }
    });

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const password = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
            const submitBtn = document.getElementById('submitBtn');

            if (!password || !confirmPassword) {
                return Swal.fire({ 
                    icon: 'warning', 
                    title: 'Fields Required', 
                    text: 'Please fill out both password fields.', 
                    confirmButtonColor: '#222', 
                    heightAuto: false 
                });
            }

            if (password !== confirmPassword) {
                return Swal.fire({ 
                    icon: 'warning', 
                    title: 'Check Passwords', 
                    text: 'Your passwords do not match!', 
                    confirmButtonColor: '#222', 
                    heightAuto: false 
                });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
            if (!passwordRegex.test(password)) {
                return Swal.fire({ 
                    icon: 'warning', 
                    title: 'Weak Password', 
                    text: 'Password must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!, @, #, $).', 
                    confirmButtonColor: '#222',
                    heightAuto: false 
                });
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/reset-password', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken 
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