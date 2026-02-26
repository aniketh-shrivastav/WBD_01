document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab');
    const tableRows = document.querySelectorAll('.order-table tbody tr');
    const filterDropdown = document.querySelector('.dropdown');
    const filterBtn = document.querySelector('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const actionButtons = document.querySelector('.action-buttons');

    // Function to filter the table based on the active tab (status)
    function getStatusFromTab(tabText) {
        if (tabText === 'Open') return 'Open';
        if (tabText === 'Confirmed') return 'Confirmed';
        if (tabText === 'Ready') return 'Ready';
        return 'Rejected';
    }

    function filterTable() {
        const activeTab = document.querySelector('.tab.active').textContent.trim();
        const statusFilter = getStatusFromTab(activeTab);
        const searchTerm = searchInput.value.trim().toLowerCase();
        const sortOrder = filterDropdown.value;

        let filteredRows = [...tableRows];

        filteredRows.forEach(row => {
            const status = row.cells[10]?.textContent.trim(); // Status column
            const customerName = row.cells[5]?.textContent.toLowerCase();
            const customerEmail = row.cells[6]?.textContent.toLowerCase();

            const matchesStatus = (status === statusFilter);
            const matchesSearch = (!searchTerm || customerName.includes(searchTerm) || customerEmail.includes(searchTerm));

            if (matchesStatus && matchesSearch) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Sort rows if needed (by order sent date)
        const tbody = document.querySelector('.order-table tbody');
        const sorted = [...tbody.querySelectorAll('tr')].sort((a, b) => {
            const dateA = new Date(a.cells[11].textContent.trim());
            const dateB = new Date(b.cells[11].textContent.trim());
            return sortOrder === 'Newest Order Sent' ? dateB - dateA : dateA - dateB;
        });
        sorted.forEach(row => tbody.appendChild(row));

        // Show/hide action buttons based on tab status
        actionButtons.style.display = activeTab === 'Open' ? 'flex' : 'none';
    }

    // Event listeners for tab changes
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterTable();
        });
    });

    // Event listener for filter button
    filterBtn.addEventListener('click', filterTable);
    
    // Event listener for search input
    searchInput.addEventListener('input', filterTable);

    // Bulk Confirm
document.querySelector('.confirm-btn').addEventListener('click', function () {
    updateSelectedBookings('Confirmed');
});

// Bulk Reject
document.querySelector('.reject-btn').addEventListener('click', function () {
    updateSelectedBookings('Rejected');
});

// Ready Button (per row, shown only if status is 'Confirmed')
document.querySelectorAll('.btn-ready').forEach(button => {
    button.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        updateSingleBooking(orderId, 'Ready');
    });
});

// Helper to update selected checkboxes
function updateSelectedBookings(newStatus) {
    const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.orderId);

    if (selectedIds.length === 0) return;

    fetch('/service/updateMultipleBookingStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds, newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) window.location.reload();
    });
}

// Helper to update a single booking (e.g., to Ready)
function updateSingleBooking(orderId, newStatus) {
    fetch('/service/updateBookingStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) window.location.reload();
    });
}

    // Function to handle status update for bookings
    function handleStatusUpdate(orderId, newStatus) {
        fetch('/service/updateBookingStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, newStatus })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.reload(); // Reload the page to reflect changes
            }
        });
    }

    // Initial load
    filterTable();
});