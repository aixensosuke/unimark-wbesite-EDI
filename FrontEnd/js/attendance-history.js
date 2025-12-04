// Initialize Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            initializeAttendanceHistory();
        } else {
            // User is not signed in, redirect to login
            window.location.href = '../../index.html';
        }
    });
});

// Global variables
let allAttendanceData = [];
let filteredAttendanceData = [];
let currentPage = 1;
const recordsPerPage = 10;

// Initialize attendance history functionality
async function initializeAttendanceHistory() {
    try {
        // Setup event listeners
        setupEventListeners();
        
        // Show loading message
        showStatusMessage('Loading attendance records...', 'info');
        
        // Load attendance data
        await loadAttendanceData();
        
    } catch (error) {
        console.error('Error initializing attendance history:', error);
        showStatusMessage('Error loading attendance records: ' + error.message, 'error');
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Filter event listeners
    document.getElementById('date-filter').addEventListener('change', applyFilters);
    document.getElementById('search-filter').addEventListener('input', applyFilters);
    
    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Excel export dropdown options
    const exportDropdownOptions = document.querySelectorAll('.export-dropdown-content a');
    if (exportDropdownOptions.length > 0) {
        exportDropdownOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const chartType = this.getAttribute('data-chart-type');
                exportToExcel(chartType);
            });
        });
    }
    
    // Main Excel button click - toggle dropdown on click
    const exportExcelBtn = document.getElementById('export-excel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function(e) {
            // Prevent default to avoid any navigation
            e.preventDefault();
            // Toggle dropdown visibility
            const dropdown = this.nextElementSibling;
            if (dropdown && dropdown.classList.contains('export-dropdown-content')) {
                dropdown.classList.toggle('show');
            }
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(event) {
                if (!exportExcelBtn.contains(event.target)) {
                    const dropdowns = document.querySelectorAll('.export-dropdown-content');
                    dropdowns.forEach(dd => dd.classList.remove('show'));
                    document.removeEventListener('click', closeDropdown);
                }
            });
        });
    }
}

// Load all sessions where the user has marked attendance
async function loadAttendanceData() {
    try {
        allAttendanceData = [];
        const user = firebase.auth().currentUser;
        
        if (!user) {
            showStatusMessage('You need to be logged in to view attendance records', 'error');
            return;
        }
        
        // Get all sessions from Firestore
        const sessionsRef = firebase.firestore().collection('sessions');
        const querySnapshot = await sessionsRef.get();
        
        if (querySnapshot.empty) {
            updateAttendanceTable([]);
            showStatusMessage('No sessions found in the database.', 'info');
            return;
        }
        
        const sessions = [];
        let attendedSessions = 0;
        let recentSessions = 0;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        // Process each session
        querySnapshot.forEach(doc => {
            const sessionData = doc.data();
            const sessionId = doc.id;
            
            // Check if the user has attended this session
            const userAttended = sessionData.attendees && 
                                 Array.isArray(sessionData.attendees) && 
                                 sessionData.attendees.some(attendee => attendee.userId === user.uid);
            
            if (userAttended) {
                // Find user's attendance record
                const userAttendanceRecord = sessionData.attendees.find(attendee => attendee.userId === user.uid);
                
                // Convert timestamp
                let attendanceTimestamp = null;
                if (userAttendanceRecord.timestamp) {
                    if (typeof userAttendanceRecord.timestamp.toDate === 'function') {
                        attendanceTimestamp = userAttendanceRecord.timestamp.toDate();
                    } else if (userAttendanceRecord.timestamp instanceof Date) {
                        attendanceTimestamp = userAttendanceRecord.timestamp;
                    } else {
                        attendanceTimestamp = new Date(userAttendanceRecord.timestamp);
                    }
                } else {
                    // Use session creation time as fallback
                    attendanceTimestamp = sessionData.createdAt ? 
                        (typeof sessionData.createdAt.toDate === 'function' ? 
                            sessionData.createdAt.toDate() : new Date(sessionData.createdAt)) : 
                        new Date();
                }
                
                // Check if it's a recent session (within last month)
                if (attendanceTimestamp > oneMonthAgo) {
                    recentSessions++;
                }
                
                // Create the attendance record
                const attendanceRecord = {
                    sessionId: sessionId,
                    sessionCode: sessionData.code || 'Unknown',
                    timestamp: attendanceTimestamp,
                    location: sessionData.location ? 
                        `${sessionData.location.lat.toFixed(6)}, ${sessionData.location.lng.toFixed(6)}` : 
                        'Unknown',
                    locationName: sessionData.locationName || 'Unknown',
                    creator: sessionData.createdBy || 'Unknown',
                    status: 'Present',
                    creatorName: 'Unknown' // Will be updated later if possible
                };
                
                // Add to attendance data
                allAttendanceData.push(attendanceRecord);
                attendedSessions++;
            }
        });
        
        // Update stats - with null checks since these elements are commented out
        const totalSessionsEl = document.getElementById('total-sessions');
        const attendedSessionsEl = document.getElementById('attended-sessions');
        const attendanceRateEl = document.getElementById('attendance-rate');
        const recentSessionsEl = document.getElementById('recent-sessions');
        
        if (totalSessionsEl) totalSessionsEl.textContent = querySnapshot.size;
        if (attendedSessionsEl) attendedSessionsEl.textContent = attendedSessions;
        if (attendanceRateEl) {
            attendanceRateEl.textContent = querySnapshot.size > 0 ? 
                Math.round((attendedSessions / querySnapshot.size) * 100) + '%' : '0%';
        }
        if (recentSessionsEl) recentSessionsEl.textContent = recentSessions;
        
        // Sort records by date (newest first)
        allAttendanceData.sort((a, b) => b.timestamp - a.timestamp);
        
        // Apply filters and update table
        applyFilters();
        
        // Hide loading message if successful
        hideStatusMessage();
        
        // Show success message if records found
        if (allAttendanceData.length > 0) {
            showStatusMessage(`Successfully loaded ${allAttendanceData.length} attendance records.`, 'success');
            // Hide success message after 3 seconds
            setTimeout(hideStatusMessage, 3000);
        }
        
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showStatusMessage('Error loading attendance data: ' + error.message, 'error');
    }
}

// Apply filters to attendance data
function applyFilters() {
    try {
        const dateFilter = document.getElementById('date-filter').value;
        const searchFilter = document.getElementById('search-filter').value.toLowerCase();
        
        // Date range filters
        let startDate = null;
        let endDate = null;
        
        if (dateFilter === 'today') {
            const today = new Date();
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(today.setHours(23, 59, 59, 999));
        } else if (dateFilter === 'week') {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            
            startDate = new Date(today.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (dateFilter === 'month') {
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (dateFilter === 'semester') {
            // Assume a semester is roughly 4 months
            const today = new Date();
            const currentMonth = today.getMonth();
            
            // First semester: Jan-Apr, Second semester: May-Aug, Third semester: Sep-Dec
            if (currentMonth >= 0 && currentMonth <= 3) {
                // First semester
                startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), 4, 0, 23, 59, 59, 999);
            } else if (currentMonth >= 4 && currentMonth <= 7) {
                // Second semester
                startDate = new Date(today.getFullYear(), 4, 1, 0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), 8, 0, 23, 59, 59, 999);
            } else {
                // Third semester
                startDate = new Date(today.getFullYear(), 8, 1, 0, 0, 0, 0);
                endDate = new Date(today.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
            }
        }
        
        // Filter the data
        filteredAttendanceData = allAttendanceData.filter(record => {
            // Date filter
            if (startDate && endDate) {
                const recordDate = record.timestamp;
                if (recordDate < startDate || recordDate > endDate) {
                    return false;
                }
            }
            
            // Search filter
            if (searchFilter) {
                const searchString = `${record.sessionCode} ${record.locationName} ${record.location}`.toLowerCase();
                if (!searchString.includes(searchFilter)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update table with filtered data
        updateAttendanceTable(filteredAttendanceData);
        
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

// Update attendance table with data
function updateAttendanceTable(data) {
    const tableBody = document.getElementById('attendance-records');
    const emptyMessage = document.getElementById('empty-message');
    
    // Show/hide empty message
    if (data.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        // Hide pagination if no records
        document.getElementById('pagination').style.display = 'none';
        // Disable export buttons
        const exportBtns = document.querySelectorAll('#export-csv, #export-excel');
        exportBtns.forEach(btn => {
            if (btn) btn.disabled = true;
        });
        return;
    }
    
    if (emptyMessage) emptyMessage.style.display = 'none';
    
    // Enable export buttons
    const exportBtns = document.querySelectorAll('#export-csv, #export-excel');
    exportBtns.forEach(btn => {
        if (btn) btn.disabled = false;
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(data.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, data.length);
    const currentPageData = data.slice(startIndex, endIndex);
    
    // Clear existing rows
    if (tableBody) tableBody.innerHTML = '';
    
    // Add data rows
    currentPageData.forEach(record => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${escapeHtml(record.sessionCode)}</td>
            <td>${formatDate(record.timestamp)}</td>
            <td>${escapeHtml(record.locationName)}</td>
            <td>${escapeHtml(record.creatorName)}</td>
            <td><span class="attendance-status present">${record.status}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination(totalPages);
}

// Update pagination controls
function updatePagination(totalPages) {
    const paginationElement = document.getElementById('pagination');
    
    if (!paginationElement) return;
    
    // Show pagination if we have pages
    paginationElement.style.display = totalPages > 1 ? 'flex' : 'none';
    if (totalPages <= 1) return;
    
    paginationElement.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    if (currentPage > 1) {
        prevButton.addEventListener('click', () => goToPage(currentPage - 1));
    }
    paginationElement.appendChild(prevButton);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || 
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)) {
            
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            
            if (i !== currentPage) {
                pageButton.addEventListener('click', () => goToPage(i));
            }
            
            paginationElement.appendChild(pageButton);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationElement.appendChild(ellipsis);
        }
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    if (currentPage < totalPages) {
        nextButton.addEventListener('click', () => goToPage(currentPage + 1));
    }
    paginationElement.appendChild(nextButton);
}

// Navigate to a specific page
function goToPage(page) {
    currentPage = page;
    updateAttendanceTable(filteredAttendanceData);
}

// Format date for display
function formatDate(date) {
    if (!date) return 'Unknown';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
}

// Export to CSV
function exportToCSV() {
    try {
        if (filteredAttendanceData.length === 0) {
            showStatusMessage('No data to export.', 'error');
            return;
        }
        
        // Create CSV content
        let csvContent = 'Session Code,Date & Time,Location,Creator,Status\n';
        
        filteredAttendanceData.forEach(record => {
            const formattedDate = formatDate(record.timestamp);
            const row = [
                `"${record.sessionCode.replace(/"/g, '""')}"`,
                `"${formattedDate.replace(/"/g, '""')}"`,
                `"${record.locationName.replace(/"/g, '""')}"`,
                `"${record.creatorName.replace(/"/g, '""')}"`,
                `"${record.status.replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\n';
        });
        
        // Create a Blob with the CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create a link element and trigger download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_history_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatusMessage('Attendance data exported successfully!', 'success');
        setTimeout(hideStatusMessage, 3000);
        
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showStatusMessage('Error exporting data: ' + error.message, 'error');
    }
}

// Export to Excel
function exportToExcel(chartType = 'none') {
    try {
        if (filteredAttendanceData.length === 0) {
            showStatusMessage('No data to export.', 'error');
            return;
        }
        
        showStatusMessage(`Preparing Excel file with ${chartType !== 'none' ? chartType + ' chart' : 'data only'}...`, 'info');
        
        // Load the required libraries dynamically
        const loadLibraries = async () => {
            // Load SheetJS
            await new Promise((resolve, reject) => {
                if (window.XLSX) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load Excel export library'));
                document.body.appendChild(script);
            });
            
            // Load Chart.js if a chart is requested
            if (chartType !== 'none') {
                await new Promise((resolve, reject) => {
                    if (window.Chart) {
                        resolve();
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Chart.js library'));
                    document.body.appendChild(script);
                });
            }
        };
        
        loadLibraries().then(() => {
            try {
                // Create worksheet with attendance data
                const worksheet = XLSX.utils.json_to_sheet(
                    filteredAttendanceData.map(record => ({
                        "Session Code": record.sessionCode,
                        "Date & Time": formatDate(record.timestamp),
                        "Location": record.locationName,
                        "Creator": record.creatorName,
                        "Status": record.status
                    }))
                );
                
                // Create workbook
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");
                
                // Add chart if requested
                if (chartType !== 'none') {
                    // Create canvas for chart
                    const canvas = document.createElement('canvas');
                    canvas.width = 800;
                    canvas.height = 600;
                    canvas.style.display = 'none';
                    document.body.appendChild(canvas);
                    
                    // Prepare data for chart
                    const sessionCounts = {};
                    
                    // Count attendances by session
                    filteredAttendanceData.forEach(record => {
                        if (!sessionCounts[record.sessionCode]) {
                            sessionCounts[record.sessionCode] = 0;
                        }
                        sessionCounts[record.sessionCode]++;
                    });
                    
                    // Chart data
                    const labels = Object.keys(sessionCounts);
                    const data = Object.values(sessionCounts);
                    
                    // Create chart based on type
                    let chartConfig;
                    switch (chartType) {
                        case 'bar':
                            chartConfig = {
                                type: 'bar',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        label: 'Attendance Count',
                                        data: data,
                                        backgroundColor: 'rgba(39, 187, 169, 0.7)',
                                        borderColor: 'rgba(39, 187, 169, 1)',
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            title: {
                                                display: true,
                                                text: 'Number of Attendances'
                                            }
                                        },
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Session Code'
                                            }
                                        }
                                    },
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: 'Attendance by Session',
                                            font: {
                                                size: 18
                                            }
                                        }
                                    }
                                }
                            };
                            break;
                        case 'pie':
                            chartConfig = {
                                type: 'pie',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        data: data,
                                        backgroundColor: [
                                            'rgba(39, 187, 169, 0.7)',
                                            'rgba(54, 162, 235, 0.7)',
                                            'rgba(255, 206, 86, 0.7)',
                                            'rgba(75, 192, 192, 0.7)',
                                            'rgba(153, 102, 255, 0.7)',
                                            'rgba(255, 159, 64, 0.7)',
                                            'rgba(255, 99, 132, 0.7)'
                                        ],
                                        borderColor: [
                                            'rgba(39, 187, 169, 1)',
                                            'rgba(54, 162, 235, 1)',
                                            'rgba(255, 206, 86, 1)',
                                            'rgba(75, 192, 192, 1)',
                                            'rgba(153, 102, 255, 1)',
                                            'rgba(255, 159, 64, 1)',
                                            'rgba(255, 99, 132, 1)'
                                        ],
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: false,
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: 'Attendance Distribution by Session',
                                            font: {
                                                size: 18
                                            }
                                        },
                                        legend: {
                                            position: 'right'
                                        }
                                    }
                                }
                            };
                            break;
                        case 'line':
                            // Sort data by date for line chart
                            const dateData = {};
                            filteredAttendanceData.forEach(record => {
                                const date = record.timestamp.toISOString().split('T')[0];
                                if (!dateData[date]) {
                                    dateData[date] = 0;
                                }
                                dateData[date]++;
                            });
                            
                            // Sort dates
                            const sortedDates = Object.keys(dateData).sort();
                            const sortedCounts = sortedDates.map(date => dateData[date]);
                            
                            chartConfig = {
                                type: 'line',
                                data: {
                                    labels: sortedDates,
                                    datasets: [{
                                        label: 'Attendance Count',
                                        data: sortedCounts,
                                        backgroundColor: 'rgba(39, 187, 169, 0.2)',
                                        borderColor: 'rgba(39, 187, 169, 1)',
                                        borderWidth: 2,
                                        tension: 0.1,
                                        fill: true
                                    }]
                                },
                                options: {
                                    responsive: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            title: {
                                                display: true,
                                                text: 'Number of Attendances'
                                            }
                                        },
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Date'
                                            }
                                        }
                                    },
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: 'Attendance Trend Over Time',
                                            font: {
                                                size: 18
                                            }
                                        }
                                    }
                                }
                            };
                            break;
                    }
                    
                    // Create chart and convert to image
                    if (chartConfig) {
                        const chart = new Chart(canvas.getContext('2d'), chartConfig);
                        
                        // Add chart image to workbook
                        const chartImageData = canvas.toDataURL('image/png');
                        
                        // Create worksheet for chart
                        const chartWorksheet = XLSX.utils.aoa_to_sheet([[]]);
                        
                        // Add image to worksheet
                        const imageId = workbook.addImage({
                            base64: chartImageData.split(',')[1],
                            extension: 'png',
                        });
                        
                        chartWorksheet['!images'] = [
                            {
                                name: 'chart',
                                type: 'image',
                                position: {
                                    type: 'absoluteAnchor',
                                    x: 0,
                                    y: 0,
                                    width: 800,
                                    height: 600
                                }
                            }
                        ];
                        
                        // Add chart worksheet to workbook
                        XLSX.utils.book_append_sheet(workbook, chartWorksheet, `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`);
                        
                        // Clean up
                        chart.destroy();
                        document.body.removeChild(canvas);
                    }
                }
                
                // Generate Excel file
                const fileName = `attendance_history_${chartType !== 'none' ? chartType + '_chart_' : ''}${new Date().toISOString().slice(0,10)}.xlsx`;
                XLSX.writeFile(workbook, fileName);
                
                showStatusMessage('Attendance data exported to Excel successfully!', 'success');
                setTimeout(hideStatusMessage, 3000);
            } catch (error) {
                console.error('Error generating Excel file:', error);
                showStatusMessage('Error generating Excel file: ' + error.message, 'error');
            }
        }).catch(error => {
            showStatusMessage(error.message, 'error');
        });
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showStatusMessage('Error exporting data: ' + error.message, 'error');
    }
}

// Show status messages
function showStatusMessage(message, type) {
    const statusElement = document.getElementById('status-message');
    
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
}

// Hide status message
function hideStatusMessage() {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
} 