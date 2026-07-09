document.addEventListener('DOMContentLoaded', () => {
    function updateDateTime() {
        const display = document.getElementById('datetimeDisplay');
        if (!display) return;
        
        const now = new Date();
        const opts = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        display.textContent = now.toLocaleDateString('en-IN', opts);
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('appSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (hamburgerMenu && sidebar) {
        hamburgerMenu.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });

        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            });
        }

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !hamburgerMenu.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                }
            }
        });
    }
 
    const mainProductImage = document.getElementById('mainProductImage');
    document.querySelectorAll('.thumb-img').forEach(thumb => {
        thumb.addEventListener('click', function () {
            document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            if (mainProductImage) {
                mainProductImage.src = this.src;
            }
        });
    });
});