document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value;

    const bannerInput = document.getElementById('bannerText');
    let savedBannerText = bannerInput ? bannerInput.value : '';

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);

        if (modal) {
            modal.classList.remove('show');
        }

        if (modalId === 'bannerDetailsModal' && bannerInput) {
            bannerInput.value = savedBannerText;
        }
    }

    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');

        if (closeBtn) {
            const modalId = closeBtn.getAttribute('data-close');
            closeModal(modalId);
        }
    });

    document.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');

        if (
            modal &&
            modal.id !== 'sidebarOverlay' &&
            e.target === modal
        ) {
            closeModal(modal.id);
        }
    });

    const openBannerModalBtn = document.getElementById('openBannerModalBtn');

    if (openBannerModalBtn) {
        openBannerModalBtn.addEventListener('click', () => {
            openModal('bannerDetailsModal');
        });
    }

    const bannerDetailsForm = document.getElementById('bannerDetailsForm');

    if (bannerDetailsForm) {
        bannerDetailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const bannerText = document
                .getElementById('bannerText')
                .value.trim();

            const submitBtn = document.getElementById('saveBannerBtn');
            const originalText = submitBtn.innerHTML;

            submitBtn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/admin/dashboard/banner', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ bannerText })
                });

                const data = await response.json();

                if (data.success) {
                    savedBannerText = bannerText;

                    closeModal('bannerDetailsModal');

                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: data.message,
                        showConfirmButton: false,
                        timer: 1500,
                        heightAuto: false
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Save Failed',
                        text: data.message,
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (error) {
                console.error('AJAX Error:', error);

                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Unable to connect to server. Please try again.',
                    confirmButtonColor: '#222',
                    heightAuto: false
                });
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    function updateDateTime() {
        const now = new Date();

        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const formattedDateTime = now.toLocaleDateString(
            'en-IN',
            options
        );

        const dateTimeDisplay =
            document.getElementById('datetimeDisplay');

        if (dateTimeDisplay) {
            dateTimeDisplay.textContent = formattedDateTime;
        }
    }

    updateDateTime();
    setInterval(updateDateTime, 60000);

    function toggleSidebar() {
        appSidebar?.classList.toggle('active');
        sidebarOverlay?.classList.toggle('active');
    }

    hamburgerBtn?.addEventListener('click', toggleSidebar);
    closeSidebarBtn?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', toggleSidebar);

    document.querySelectorAll('.progress-bar-fill').forEach((bar) => {
        const width = bar.dataset.width;

        if (width) {
            bar.style.width = `${width}%`;
        }
    });
});