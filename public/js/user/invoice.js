document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    if (printInvoiceBtn) {
        printInvoiceBtn.addEventListener('click', () => {
            window.print();
        });
    }
});