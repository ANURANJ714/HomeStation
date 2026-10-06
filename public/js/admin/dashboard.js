document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.getElementById('csrfToken')?.value;

    let revenueChart = null;
    const canvasElement = document.getElementById('revenueChartCanvas');
    const filterSelect = document.getElementById('revenueChartFilter');
    const payloadInput = document.getElementById('allChartDataPayload');

    let allChartData = {
        monthly: { labels: [], data: [] },
        daily: { labels: [], data: [] },
        yearly: { labels: [], data: [] }
    };

    if (payloadInput && payloadInput.value) {
        try {
            allChartData = JSON.parse(decodeURIComponent(payloadInput.value));
        } catch (e) {
            console.error('Failed to parse chart datasets payload:', e);
        }
    }

    function renderLineChart(labels, data) {
        if (!canvasElement) return;

        const ctx = canvasElement.getContext('2d');

        if (revenueChart) {
            revenueChart.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
        gradient.addColorStop(0, 'rgba(26, 26, 26, 0.22)');
        gradient.addColorStop(1, 'rgba(26, 26, 26, 0.01)');

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue (₹)',
                        data: data,
                        borderColor: '#1a1a1a',
                        borderWidth: 2.5,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#1a1a1a',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleFont: { size: 13, family: 'Roboto' },
                        bodyFont: { size: 13, family: 'Roboto' },
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: function (context) {
                                return ` Revenue: ₹${Number(context.raw || 0).toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 12, family: 'Roboto' },
                            color: '#666666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f0f0f0'
                        },
                        ticks: {
                            font: { size: 12, family: 'Roboto' },
                            color: '#666666',
                            callback: function (val) {
                                return '₹' + Number(val).toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    const initialDataset = allChartData.monthly || { labels: [], data: [] };
    renderLineChart(initialDataset.labels, initialDataset.data);

    if (filterSelect) {
        filterSelect.addEventListener('change', function () {
            const selectedInterval = this.value;
            const targetData = allChartData[selectedInterval] || { labels: [], data: [] };
            renderLineChart(targetData.labels, targetData.data);
        });
    }

    const bannerInput = document.getElementById('bannerText');
    let savedBannerText = bannerInput ? bannerInput.value : '';

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
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
        if (modal && modal.id !== 'sidebarOverlay' && e.target === modal) {
            closeModal(modal.id);
        }
    });

    const openBannerModalBtn = document.getElementById('openBannerModalBtn');
    if (openBannerModalBtn) {
        openBannerModalBtn.addEventListener('click', () => openModal('bannerDetailsModal'));
    }

    const bannerDetailsForm = document.getElementById('bannerDetailsForm');
    if (bannerDetailsForm) {
        bannerDetailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const bannerText = document.getElementById('bannerText').value.trim();
            const submitBtn = document.getElementById('saveBannerBtn');
            const originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
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

        const dateTimeDisplay = document.getElementById('datetimeDisplay');
        if (dateTimeDisplay) {
            dateTimeDisplay.textContent = now.toLocaleDateString('en-IN', options);
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

    const adminLogoutForm = document.getElementById('adminLogoutForm');
    if (adminLogoutForm) {
        adminLogoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            try {
                const response = await fetch('/admin/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'csrf-token': csrfToken
                    }
                });

                if (response.redirected) {
                    window.location.href = response.url;
                    return;
                }

                const data = await response.json();

                if (data.success || response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Logged Out',
                        text: data.message || 'Redirecting to authentication login window...',
                        timer: 1500,
                        showConfirmButton: false,
                        heightAuto: false
                    }).then(() => {
                        window.location.href = '/admin/login';
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Logout Failed',
                        text: data.message || 'An unexpected issue occurred.',
                        confirmButtonColor: '#222',
                        heightAuto: false
                    });
                }
            } catch (error) {
                window.location.href = '/admin/login';
            }
        });
    }
});