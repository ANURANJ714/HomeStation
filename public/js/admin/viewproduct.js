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

    const lightboxOverlay = document.getElementById('imageLightboxOverlay');
    const lightboxImg = document.getElementById('lightboxZoomImage');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const mainImageWrapper = document.querySelector('.main-image-wrapper');

    function openLightbox() {
        if (!mainProductImage || !lightboxOverlay || !lightboxImg) return;
        
        lightboxImg.src = mainProductImage.src;
        lightboxOverlay.classList.add('show');
        document.body.style.overflow = 'hidden'; 
    }

    function closeLightbox() {
        if (!lightboxOverlay || !lightboxImg) return;
        
        lightboxOverlay.classList.remove('show');
        lightboxImg.classList.remove('zoomed'); 
        lightboxImg.style.transform = '';    
        document.body.style.overflow = '';    
    }

    if (mainImageWrapper) {
        mainImageWrapper.addEventListener('click', openLightbox);
    }

    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', closeLightbox);
    }

    if (lightboxOverlay) {
        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay || e.target === document.getElementById('lightboxImageContainer')) {
                closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxOverlay.classList.contains('show')) {
            closeLightbox();
        }
    });

    let isDragging = false;
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;

    if (lightboxImg) {
        lightboxImg.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            this.classList.toggle('zoomed');
            
            if (!this.classList.contains('zoomed')) {
                this.style.transform = '';
                translateX = 0;
                translateY = 0;
            }
        });

        lightboxImg.addEventListener('mousedown', (e) => {
            if (!lightboxImg.classList.contains('zoomed')) return;
            isDragging = true;
            lightboxImg.style.transition = 'none'; 
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            lightboxImg.style.transform = `scale(2) translate(${translateX / 2}px, ${translateY / 2}px)`;
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            lightboxImg.style.transition = 'transform 0.3s ease';
        });
    }
});