document.addEventListener('DOMContentLoaded', () => {
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
        const dtElement = document.getElementById('datetimeDisplay');
        if (dtElement) {
            dtElement.textContent = now.toLocaleDateString('en-IN', options);
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const timeFilter = document.getElementById('timeFilter');
    const customDateContainer = document.getElementById('customDateContainer');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const btnApplyCustomDate = document.getElementById('btnApplyCustomDate');

    if (timeFilter) {
        timeFilter.addEventListener('change', function () {
            const selected = this.value;
            if (selected === 'custom') {
                if (customDateContainer) {
                    customDateContainer.classList.remove('d-none');
                    customDateContainer.classList.add('d-flex');
                }
            } else {
                if (customDateContainer) {
                    customDateContainer.classList.remove('d-flex');
                    customDateContainer.classList.add('d-none');
                }
                window.location.href = `/admin/sales-report?filter=${selected}&page=1`;
            }
        });
    }

    if (btnApplyCustomDate) {
        btnApplyCustomDate.addEventListener('click', () => {
            const fromDate = fromDateInput ? fromDateInput.value : '';
            const toDate = toDateInput ? toDateInput.value : '';

            if (!fromDate || !toDate) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Date Required',
                    text: 'Please select both start and end dates.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

            if (new Date(fromDate) > new Date(toDate)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Range',
                    text: 'The start date cannot be later than the end date.',
                    confirmButtonColor: '#1a1a1a',
                    heightAuto: false
                });
            }

            window.location.href = `/admin/sales-report?filter=custom&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&page=1`;
        });
    }

    const btnDownloadPDF = document.getElementById('btnDownloadPDF');
    if (btnDownloadPDF) {
        btnDownloadPDF.addEventListener('click', () => {
            const currentFilter = timeFilter ? timeFilter.value : 'last30';
            const fromDate = fromDateInput ? fromDateInput.value : '';
            const toDate = toDateInput ? toDateInput.value : '';

            let downloadUrl = `/admin/sales-report/download-pdf?filter=${currentFilter}`;
            if (currentFilter === 'custom') {
                downloadUrl += `&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
            }

            window.location.href = downloadUrl;
        });
    }

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const currentFilter = timeFilter ? timeFilter.value : 'last30';
            const fromDate = fromDateInput ? fromDateInput.value : '';
            const toDate = toDateInput ? toDateInput.value : '';

            let exportUrl = `/admin/sales-report/export-excel?filter=${currentFilter}`;
            if (currentFilter === 'custom') {
                exportUrl += `&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
            }

            window.location.href = exportUrl;
        });
    }

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.getElementById('closeSidebar');

    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        }
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    const adminLogoutForm = document.getElementById('adminLogoutForm');
    if (adminLogoutForm) {
        adminLogoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formCsrf = adminLogoutForm.querySelector('input[name="_csrf"]')?.value || '';

            try {
                const response = await fetch('/admin/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'csrf-token': formCsrf
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
                        text: data.message || 'Redirecting to login...',
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
                        confirmButtonColor: '#1a1a1a',
                        heightAuto: false
                    });
                }
            } catch (error) {
                window.location.href = '/admin/login';
            }
        });
    }
});