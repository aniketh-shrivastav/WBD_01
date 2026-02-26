// Chart.js 
const ctx = document.getElementById('earningsChart').getContext('2d');
let earningsChart;

// Socket.IO for real-time updates
let socket = null;
function initializeSocketIO() {
    // Check if Socket.IO is available
    if (typeof io !== 'undefined') {
        socket = io();
        
        // Join earnings room with provider ID (provider ID should be passed from server)
        socket.on('connect', () => {
            console.log('Connected to earnings server');
            // Join earnings room - you can extract provider ID from DOM or session
            socket.emit('earnings:join', { providerId: getProviderId() });
        });
        
        // Listen for earnings updates
        socket.on('earnings:updated', (data) => {
            console.log('Earnings updated:', data);
            // Refresh chart immediately when earnings change
            updateChart();
            updateTodaysEarnings();
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from earnings server');
        });
    }
}

// Extract provider ID from DOM or page context
function getProviderId() {
    // Try to get from data attribute or meta tag
    const providerElement = document.querySelector('[data-provider-id]');
    if (providerElement) {
        return providerElement.getAttribute('data-provider-id');
    }
    // Try from meta tag
    const metaTag = document.querySelector('meta[name="provider-id"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    return null;
}

// Fetch real earnings data from API
async function fetchEarningsData(timeRange = 1) {
    try {
        const response = await fetch(`/service/api/earnings-data?timeRange=${timeRange}`);
        if (!response.ok) {
            throw new Error('Failed to fetch earnings data');
        }
        const data = await response.json();
        return {
            labels: data.labels,
            data: data.data,
            totalEarnings: data.totalEarnings
        };
    } catch (error) {
        console.error('Error fetching earnings data:', error);
        // Fallback to empty data if API fails
        return { labels: [], data: [], totalEarnings: 0 };
    }
}

function getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
}

// Update chart with real data
async function updateChart() {
    const timeRange = parseInt(document.getElementById('timeRange').value);
    const { labels, data, totalEarnings } = await fetchEarningsData(timeRange);

    // Update total earnings display
    document.getElementById('totalEarnings').textContent = `Total Earnings: ₹${totalEarnings.toLocaleString()}`;

    // Update chart data
    if (earningsChart) {
        earningsChart.data.labels = labels;
        earningsChart.data.datasets[0].data = data;
        earningsChart.options.scales.x.title.text = timeRange === 1 ? 'Weeks' : 'Months';
        earningsChart.update();
    }
}

async function initializeChart() {
    const { labels, data, totalEarnings } = await fetchEarningsData(1); // Show current month by default

    // Update total earnings display
    document.getElementById('totalEarnings').textContent = `Total Earnings: ₹${totalEarnings.toLocaleString()}`;

    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Earnings (₹)',
                data: data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.4, // Smooth curve
                pointRadius: 5, // Make data points visible
                pointBackgroundColor: '#007bff', // Color of data points
                borderWidth: 2 // Thicker line
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e0e0e0'
                    },
                    title: {
                        display: true,
                        text: 'Earnings (₹)'
                    }
                },
                x: {
                    grid: {
                        color: '#e0e0e0'
                    },
                    title: {
                        display: true,
                        text: 'Weeks'
                    }
                }
            }
        }
    });
}


function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}


document.querySelectorAll('.payout-history tbody tr').forEach((row, index) => {
    row.addEventListener('click', () => {
        // Remove any previously selected row's highlight
        document.querySelectorAll('.payout-history tbody tr').forEach((r) => {
            r.classList.remove('selected-row');
        });

       
        row.classList.add('selected-row');

        
    });
});



function calculateTodaysEarnings() {
   
    const todaysEarnings = Math.floor(Math.random() * 2000) + 500; 
    return todaysEarnings;
}

// Fetch today's earnings from real data
async function fetchTodaysEarnings() {
    try {
        const response = await fetch(`/service/api/earnings-data?timeRange=1`);
        if (!response.ok) {
            throw new Error('Failed to fetch earnings data');
        }
        const data = await response.json();
        
        // If we have data for today, use the last week's data (which includes today)
        // Otherwise, return 0
        if (data.data.length > 0) {
            const lastWeekEarnings = data.data[data.data.length - 1] || 0;
            return lastWeekEarnings;
        }
        return 0;
    } catch (error) {
        console.error('Error fetching today earnings:', error);
        return 0;
    }
}

function updateTodaysEarnings() {
    fetchTodaysEarnings().then(todaysEarnings => {
        document.getElementById('todaysEarnings').textContent = `₹${todaysEarnings.toLocaleString()}`;
    });
}


// Set up polling to refresh earnings data every 30 seconds
function setupEarningsRefresh() {
    setInterval(() => {
        updateChart();
        updateTodaysEarnings();
    }, 30000); // Refresh every 30 seconds
}

// Set up auto-refresh when time range changes
document.addEventListener('DOMContentLoaded', () => {
    const timeRangeSelect = document.getElementById('timeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', updateChart);
    }
});

window.onload = function () {
    initializeChart();
    updateTodaysEarnings();
    setupEarningsRefresh();
    initializeSocketIO(); // Initialize real-time updates
};


function viewDetails(date, amount, status, orderId, customerId, serviceProvided) {
    alert(
        `Payout Details:
        \nDate: ${date}
        \nAmount: ${amount}
        \nStatus: ${status}
        \nOrder ID: ${orderId}
        \nCustomer ID: ${customerId}
        \nService Provided: ${serviceProvided}`
    );
}

