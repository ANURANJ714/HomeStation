document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value || '';
    const otpInputs = document.querySelectorAll('.otp-input');
    const timerContainer = document.getElementById('timerContainer');
    const otpForm = document.getElementById('otpForm');
    const otpError = document.getElementById('otpError');
    const otpInputContainer = document.getElementById('otpInputContainer');

    let timeLeft = 60;
    let countdown;

    function showOtpError(message) {
        if (otpError) {
            otpError.innerText = message;
            otpError.classList.add('active');
        }
        if (otpInputContainer) {
            otpInputContainer.classList.add('has-error');
        }
    }

    function clearOtpError() {
        if (otpError) {
            otpError.innerText = '';
            otpError.classList.remove('active');
        }
        if (otpInputContainer) {
            otpInputContainer.classList.remove('has-error');
        }
    }

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            clearOtpError();
        });

        input.addEventListener('keyup', (e) => {
            const nextInput = input.nextElementSibling;
            const prevInput = input.previousElementSibling;

            if (input.value.length === 1 && nextInput && e.key !== 'Backspace') {
                nextInput.focus();
            }
            if (e.key === 'Backspace' && prevInput) {
                prevInput.value = '';
                prevInput.focus();
            }
        });
    });

    function startTimer() {
        if (!timerContainer) return;
        timerContainer.innerHTML = '<span id="timer">' + timeLeft + '</span>s remaining';

        countdown = setInterval(() => {
            timeLeft--;
            const currentTimerElement = document.getElementById('timer');
            if (currentTimerElement) currentTimerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown);
                timerContainer.innerHTML = '<span id="resendOtpBtn" class="resend-otp-anchor">Resend OTP</span>';
            }
        }, 1000);
    }

    startTimer();

    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'resendOtpBtn') {
            e.preventDefault();
            clearOtpError();
            
            timerContainer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

            try {
                const response = await fetch('/user/resend-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    }
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sent!',
                        text: data.message,
                        timer: 2000,
                        showConfirmButton: false,
                        heightAuto: false
                    });

                    timeLeft = 60;
                    startTimer();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Could not resend',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                    timerContainer.innerHTML = '<span id="resendOtpBtn" class="resend-otp-anchor">Resend OTP</span>';
                }
            } catch (error) {
                console.error("Resend OTP network error:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Server connection failed.', heightAuto: false });
                timerContainer.innerHTML = '<span id="resendOtpBtn" class="resend-otp-anchor">Resend OTP</span>';
            }
        }
    });

    if (otpForm) {
        otpForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearOtpError();

            let otp = '';
            otpInputs.forEach(input => {
                otp += input.value.trim();
            });

            if (otp.length === 0) {
                showOtpError('Please enter the 6-digit verification code.');
                return;
            }

            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                showOtpError('The verification code must be exactly 6 digits.');
                return;
            }

            const combinedOtpInput = document.getElementById('combinedOtp');
            if (combinedOtpInput) combinedOtpInput.value = otp;

            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/user/verify-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken,
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ otp: otp })
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Verified!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = data.redirectUrl || '/user/profile';
                    });
                } else {
                    showOtpError(data.message || 'Verification failed. Please check the OTP.');
                    Swal.fire({
                        icon: 'error',
                        title: 'Verification Failed',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error("Verification network error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Server Error',
                    text: 'An error occurred during verification. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});