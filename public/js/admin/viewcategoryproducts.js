document.addEventListener('DOMContentLoaded', () => {
    const categoryId = document.getElementById('categoryIdHidden')?.value;
    const searchQuery = document.getElementById('searchQueryHidden')?.value || '';

    function updateDateTime() {
        const display = document.getElementById('datetimeDisplay');
        if (!display) return;
        
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        display.textContent = now.toLocaleDateString('en-IN', options);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (appSidebar) appSidebar.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    }

    if (hamburgerMenu) hamburgerMenu.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            if (appSidebar) appSidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
    });

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            window.location.href = `/admin/categories/${categoryId}/products?search=${encodeURIComponent(searchQuery)}&sort=${this.value}`;
        });
    }
});