// Initialize Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            initializeAttendanceRecords();
        } else {
            // User is not signed in, redirect to login
            window.location.href = '../../index.html';
        }
    });
});

// Global variables
let allAttendanceData = [];
let filteredAttendanceData = [];
let sessionsData = {};
let currentPage = 1;
const recordsPerPage = 20;

// Variables to store deleted sessions for undo functionality
let lastDeletedSessionData = null;
let deleteSessionTimeout = null;
let isGlobalDelete = false;
let currentModalSessionId = null;

// Initialize attendance records functionality
async function initializeAttendanceRecords() {
    try {
        // Check if user is a supervisor
        const user = firebase.auth().currentUser;
        const supervisorInfo = await getSupervisorInfo(user.uid);
        
        if (!supervisorInfo.isSupervisor) {
            showStatusMessage('Only supervisors can access attendance records.', 'error');
            return;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Show loading message
        showStatusMessage('Loading attendance records...', 'info');
        
        // Load all sessions first
        await loadSupervisorSessions();
        
        // Load attendance data
        await loadAllAttendanceData();
    } catch (error) {
        console.error('Error initializing attendance records:', error);
        showStatusMessage('Error loading attendance records: ' + error.message, 'error');
    }
}

// Check if user is a supervisor and get their organization ID
async function getSupervisorInfo(userId) {
    try {
        const supervisorDoc = await firebase.firestore().collection('supervisors').doc(userId).get();
        if (!supervisorDoc.exists) {
            return { isSupervisor: false };
        }
        
        const data = supervisorDoc.data();
        return {
            isSupervisor: true,
            organizationId: data.organizationId || null
        };
    } catch (error) {
        console.error('Error checking supervisor info:', error);
        return { isSupervisor: false, error: error.message };
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Filter event listeners
    document.getElementById('session-filter').addEventListener('change', applyFilters);
    document.getElementById('date-filter').addEventListener('change', handleDateFilterChange);
    document.getElementById('search-filter').addEventListener('input', applyFilters);
    
    // Date range filter listeners (when custom range is selected)
    document.getElementById('date-start').addEventListener('change', applyFilters);
    document.getElementById('date-end').addEventListener('change', applyFilters);
    
    // Export buttons
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('refresh-data').addEventListener('click', refreshData);
    
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
    
    // Session deletion functionality
    document.getElementById('delete-all-sessions').addEventListener('click', showDeleteAllSessionsModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', handleDeleteConfirmation);
    
    // Handle clicks outside modal to close it
    document.getElementById('delete-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDeleteModal();
        }
    });
    
    // Initialize keyboard accessibility for modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('delete-modal').classList.contains('active')) {
            closeDeleteModal();
        }
    });
}

// Handle date filter change to show/hide custom date range inputs
function handleDateFilterChange() {
    const dateFilter = document.getElementById('date-filter').value;
    const dateRangeContainer = document.getElementById('date-range-container');
    const dateRangeEndContainer = document.getElementById('date-range-end-container');
    
    if (dateFilter === 'custom') {
        dateRangeContainer.style.display = 'flex';
        dateRangeEndContainer.style.display = 'flex';
    } else {
        dateRangeContainer.style.display = 'none';
        dateRangeEndContainer.style.display = 'none';
    }
    
    applyFilters();
}

// Load all sessions created by the supervisor
async function loadSupervisorSessions() {
    try {
        const user = firebase.auth().currentUser;
        const sessionsRef = firebase.firestore().collection('sessions');
        const querySnapshot = await sessionsRef.where('createdBy', '==', user.uid).get();
        
        if (querySnapshot.empty) {
            console.log('No sessions found');
            return;
        }
        
        // Store sessions data for reference
        querySnapshot.forEach(doc => {
            const sessionData = doc.data();
            sessionsData[doc.id] = {
                id: doc.id,
                code: sessionData.code || 'Unknown',
                status: sessionData.status || 'Unknown',
                location: sessionData.location || 'Unknown'
            };
        });
        
        // Populate session filter dropdown
        populateSessionFilter();
    } catch (error) {
        console.error('Error loading sessions:', error);
        showStatusMessage('Error loading sessions: ' + error.message, 'error');
    }
}

// Populate session filter dropdown with available sessions
function populateSessionFilter() {
    const sessionFilter = document.getElementById('session-filter');
    const fragment = document.createDocumentFragment();
    
    // Keep the "All Sessions" option
    const allOption = sessionFilter.options[0];
    
    // Clear existing options except the first one
    sessionFilter.innerHTML = '';
    sessionFilter.appendChild(allOption);
    
    // Add sessions to dropdown
    Object.values(sessionsData).forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `${session.code} (${session.location})`;
        fragment.appendChild(option);
    });
    
    sessionFilter.appendChild(fragment);
}

// Load all attendance data from sessions
async function loadAllAttendanceData() {
    try {
        allAttendanceData = [];
        
        if (Object.keys(sessionsData).length === 0) {
            updateAttendanceTable(allAttendanceData);
            showStatusMessage('No sessions found. Create a session first.', 'info');
            return;
        }
        
        const attendancePromises = Object.keys(sessionsData).map(async (sessionId) => {
            return loadSessionAttendees(sessionId);
        });
        
        await Promise.all(attendancePromises);
        
        // Once all attendance data is loaded, apply filters and update table
        applyFilters();
        
        // Hide loading message if successful
        document.getElementById('status-message').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showStatusMessage('Error loading attendance data: ' + error.message, 'error');
    }
}

// Load attendees for a specific session
async function loadSessionAttendees(sessionId) {
    try {
        const sessionRef = firebase.firestore().collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        
        if (!sessionDoc.exists) {
            console.log(`Session ${sessionId} does not exist`);
            return;
        }
        
        const sessionData = sessionDoc.data();
        
        // Check if session has attendees
        if (!sessionData.attendees || !Array.isArray(sessionData.attendees)) {
            console.log(`Session ${sessionId} has no attendees`);
            return;
        }
        
        // Process attendees
        sessionData.attendees.forEach(attendee => {
            const attendeeData = {
                userId: attendee.userId || 'Unknown',
                name: attendee.name || 'Unknown',
                email: attendee.email || 'Unknown',
                studentId: attendee.studentId || 'N/A',
                timestamp: attendee.timestamp ? 
                    (typeof attendee.timestamp.toDate === 'function' ? 
                        attendee.timestamp.toDate() : 
                        new Date(attendee.timestamp)) : 
                    new Date(),
                sessionId: sessionId,
                sessionCode: sessionsData[sessionId]?.code || 'Unknown',
                sessionLocation: sessionsData[sessionId]?.location || 'Unknown',
                status: 'Present' // Default status for attendees
            };
            
            allAttendanceData.push(attendeeData);
        });
    } catch (error) {
        console.error(`Error loading attendees for session ${sessionId}:`, error);
    }
}

// Apply filters to attendance data
function applyFilters() {
    try {
        const sessionFilter = document.getElementById('session-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const searchFilter = document.getElementById('search-filter').value.toLowerCase();
        
        // Date range filters
        let startDate = null;
        let endDate = null;
        
        if (dateFilter === 'custom') {
            const startDateInput = document.getElementById('date-start').value;
            const endDateInput = document.getElementById('date-end').value;
            
            if (startDateInput) {
                startDate = new Date(startDateInput);
                startDate.setHours(0, 0, 0, 0);
            }
            
            if (endDateInput) {
                endDate = new Date(endDateInput);
                endDate.setHours(23, 59, 59, 999);
            }
        } else if (dateFilter === 'today') {
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
        }
        
        // Filter the data
        filteredAttendanceData = allAttendanceData.filter(record => {
            // Session filter
            if (sessionFilter !== 'all' && record.sessionId !== sessionFilter) {
                return false;
            }
            
            // Date filter
            if (startDate && endDate) {
                const recordDate = record.timestamp;
                if (recordDate < startDate || recordDate > endDate) {
                    return false;
                }
            }
            
            // Search filter
            if (searchFilter) {
                const searchString = `${record.name} ${record.email} ${record.studentId} ${record.userId}`.toLowerCase();
                if (!searchString.includes(searchFilter)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Sort by date (most recent first)
        filteredAttendanceData.sort((a, b) => b.timestamp - a.timestamp);
        
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
    const emptyRecordsDiv = document.getElementById('empty-records');
    const recordCountSpan = document.getElementById('record-count');
    
    // Update count display
    if (recordCountSpan) {
        recordCountSpan.textContent = data.length;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Check if we have data
    if (data.length === 0) {
        if (emptyRecordsDiv) {
            emptyRecordsDiv.style.display = 'block';
        }
        return;
    }
    
    // Hide empty message if we have data
    if (emptyRecordsDiv) {
        emptyRecordsDiv.style.display = 'none';
    }
    
    // Determine which page of data to show
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);
    
    // Create table rows
    pageData.forEach(record => {
        const row = document.createElement('tr');
        
        // Format date string
        let dateDisplay = 'Unknown';
        if (record.timestamp) {
            dateDisplay = formatDate(record.timestamp);
        }
        
        // Create row content
        row.innerHTML = `
            <td>${escapeHtml(record.name || 'Unknown')}</td>
            <td>${escapeHtml(record.studentId || 'N/A')}</td>
            <td>${escapeHtml(record.email || 'Unknown')}</td>
            <td>
                <a href="session-details.html?id=${escapeHtml(record.sessionId)}" class="session-link">
                    ${escapeHtml(record.sessionCode || 'Unknown')}
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </td>
            <td class="date-column">${dateDisplay}</td>
            <td>
                <span class="attendance-status ${record.status.toLowerCase()}">
                    ${escapeHtml(record.status || 'Unknown')}
                </span>
            </td>
            <td>
                <button class="delete-action" aria-label="Delete session ${escapeHtml(record.sessionCode || 'Unknown')}" 
                  data-session-id="${escapeHtml(record.sessionId)}" 
                  data-session-code="${escapeHtml(record.sessionCode || 'Unknown')}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-action').forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            const sessionCode = this.getAttribute('data-session-code');
            showDeleteSessionModal(sessionId, sessionCode);
        });
    });
    
    // Update pagination
    updatePagination(Math.ceil(data.length / recordsPerPage));
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
    
    // Page buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page button if not showing page 1
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'pagination-btn';
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => goToPage(1));
        paginationElement.appendChild(firstPageBtn);
        
        // Add ellipsis if needed
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationElement.appendChild(ellipsis);
        }
    }
    
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        if (i !== currentPage) {
            pageBtn.addEventListener('click', () => goToPage(i));
        }
        paginationElement.appendChild(pageBtn);
    }
    
    // Last page button if not showing the last page
    if (endPage < totalPages) {
        // Add ellipsis if needed
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationElement.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'pagination-btn';
        lastPageBtn.textContent = totalPages;
        lastPageBtn.addEventListener('click', () => goToPage(totalPages));
        paginationElement.appendChild(lastPageBtn);
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
    
    // Scroll to the top of the table
    document.querySelector('.attendance-table-container').scrollIntoView({behavior: 'smooth'});
}

// Export attendance data to Excel
function exportToExcel(chartType = 'none') {
    try {
        if (filteredAttendanceData.length === 0) {
            showStatusMessage('No data to export. Adjust your filters and try again.', 'error');
            return;
        }
        
        showStatusMessage(`Preparing Excel file with ${chartType !== 'none' ? chartType + ' chart' : 'data only'}...`, 'info');
        
        // Load Chart.js if a chart is requested and not already loaded
        const loadChartJs = async () => {
            if (chartType !== 'none' && !window.Chart) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Chart.js library'));
                    document.body.appendChild(script);
                });
            }
            return Promise.resolve();
        };
        
        loadChartJs().then(() => {
            // Format data for Excel
            const excelData = filteredAttendanceData.map(record => ({
                'Student Name': record.name,
                'Student ID': record.studentId,
                'Email': record.email,
                'Session Code': record.sessionCode,
                'Session Location': record.sessionLocation,
                'Attendance Time': formatDate(record.timestamp),
                'Status': record.status
            }));
            
            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // Create workbook and add worksheet
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
                
                // Prepare data for chart based on the type
                let chartConfig;
                
                switch (chartType) {
                    case 'bar':
                        // Count by session
                        const sessionCounts = {};
                        filteredAttendanceData.forEach(record => {
                            if (!sessionCounts[record.sessionCode]) {
                                sessionCounts[record.sessionCode] = 0;
                            }
                            sessionCounts[record.sessionCode]++;
                        });
                        
                        chartConfig = {
                            type: 'bar',
                            data: {
                                labels: Object.keys(sessionCounts),
                                datasets: [{
                                    label: 'Attendance Count',
                                    data: Object.values(sessionCounts),
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
                        // Count by session for pie chart
                        const sessionPieCounts = {};
                        filteredAttendanceData.forEach(record => {
                            if (!sessionPieCounts[record.sessionCode]) {
                                sessionPieCounts[record.sessionCode] = 0;
                            }
                            sessionPieCounts[record.sessionCode]++;
                        });
                        
                        chartConfig = {
                            type: 'pie',
                            data: {
                                labels: Object.keys(sessionPieCounts),
                                datasets: [{
                                    data: Object.values(sessionPieCounts),
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
                        // Group by date for line chart
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
                    
                    // Add image to worksheet (using SheetJS image embedding)
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
            
            // Generate Excel file name
            const fileName = `attendance_records_${chartType !== 'none' ? chartType + '_chart_' : ''}${formatDateForFileName(new Date())}.xlsx`;
            
            // Export to Excel file
            XLSX.writeFile(workbook, fileName);
            
            showStatusMessage('Excel file exported successfully!', 'success');
            setTimeout(() => {
                document.getElementById('status-message').style.display = 'none';
            }, 3000);
        }).catch(error => {
            console.error('Error with chart generation:', error);
            showStatusMessage('Error generating chart: ' + error.message, 'error');
        });
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showStatusMessage('Error exporting to Excel: ' + error.message, 'error');
    }
}

// Export attendance data to CSV
function exportToCSV() {
    try {
        if (filteredAttendanceData.length === 0) {
            showStatusMessage('No data to export. Adjust your filters and try again.', 'error');
            return;
        }
        
        showStatusMessage('Preparing CSV file...', 'info');
        
        // CSV headers
        const headers = [
            'Student Name',
            'Student ID', 
            'Email',
            'Session Code',
            'Session Location',
            'Attendance Time',
            'Status',
            'User ID'
        ];
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        filteredAttendanceData.forEach(record => {
            const row = [
                formatCSVField(record.name),
                formatCSVField(record.studentId),
                formatCSVField(record.email),
                formatCSVField(record.sessionCode),
                formatCSVField(record.sessionLocation),
                formatCSVField(formatDate(record.timestamp)),
                formatCSVField(record.status),
                formatCSVField(record.userId)
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `attendance_records_${formatDateForFileName(new Date())}.csv`);
        document.body.appendChild(link);
        
        // Download file
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatusMessage('CSV file exported successfully!', 'success');
        setTimeout(() => {
            document.getElementById('status-message').style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showStatusMessage('Error exporting to CSV: ' + error.message, 'error');
    }
}

// Format a field for CSV (escape commas, quotes, etc.)
function formatCSVField(value) {
    if (value == null || value === undefined) return '""';
    
    const stringValue = String(value);
    
    // If the value contains commas, quotes, or newlines, escape it
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Double quotes are escaped with another double quote
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

// Refresh data
function refreshData() {
    // Show loading message
    showStatusMessage('Refreshing attendance data...', 'info');
    
    // Reset filters to default
    document.getElementById('session-filter').value = 'all';
    document.getElementById('date-filter').value = 'all';
    document.getElementById('search-filter').value = '';
    document.getElementById('date-range-container').style.display = 'none';
    document.getElementById('date-range-end-container').style.display = 'none';
    
    // Reload data
    loadSupervisorSessions().then(() => {
        loadAllAttendanceData();
    });
}

// Format date for display
function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
}

// Format date for file name
function formatDateForFileName(date) {
    if (!date) return 'unknown_date';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
}

// Show status message
function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
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

// Show delete all sessions modal
function showDeleteAllSessionsModal() {
    const modal = document.getElementById('delete-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmationContainer = document.getElementById('confirmation-checkbox-container');
    const confirmationCheckbox = document.getElementById('confirmation-checkbox');
    const confirmButton = document.getElementById('confirm-delete');
    
    // Set modal content for global deletion
    modalTitle.textContent = 'Delete All Sessions';
    modalMessage.textContent = 'WARNING: You are about to permanently delete ALL session data and student attendance records. This action cannot be easily reversed and will affect all historical data. Are you sure you want to proceed?';
    
    // Show confirmation checkbox for global deletion
    confirmationContainer.style.display = 'flex';
    confirmationCheckbox.checked = false;
    
    // Disable confirm button until checkbox is checked
    confirmButton.disabled = true;
    
    // Add event listener for checkbox
    confirmationCheckbox.addEventListener('change', function() {
        confirmButton.disabled = !this.checked;
    }, { once: true });
    
    // Set flag for global deletion
    isGlobalDelete = true;
    currentModalSessionId = null;
    
    // Show modal
    modal.classList.add('active');
}

// Show delete session modal for a specific session
function showDeleteSessionModal(sessionId, sessionCode) {
    const modal = document.getElementById('delete-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmationContainer = document.getElementById('confirmation-checkbox-container');
    const confirmButton = document.getElementById('confirm-delete');
    
    // Set modal content for individual session deletion
    modalTitle.textContent = `Delete Session: ${sessionCode}`;
    modalMessage.textContent = `Delete session ${sessionCode}? This will remove all attendance data for this session.`;
    
    // Hide confirmation checkbox for individual deletion
    confirmationContainer.style.display = 'none';
    
    // Enable confirm button for individual deletion
    confirmButton.disabled = false;
    
    // Set flag for individual deletion
    isGlobalDelete = false;
    currentModalSessionId = sessionId;
    
    // Show modal
    modal.classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('active');
}

// Handle delete confirmation
async function handleDeleteConfirmation() {
    if (isGlobalDelete) {
        await deleteAllSessions();
    } else {
        await deleteSession(currentModalSessionId);
    }
    
    // Close modal
    closeDeleteModal();
}

// Delete a specific session
async function deleteSession(sessionId) {
    try {
        // Show loading message
        showStatusMessage('Deleting session...', 'info');
        
        // Store session data for undo
        const sessionToDelete = await firebase.firestore().collection('sessions').doc(sessionId).get();
        
        if (!sessionToDelete.exists) {
            showStatusMessage('Session not found.', 'error');
            return;
        }
        
        // Store data for undo
        lastDeletedSessionData = {
            id: sessionId,
            data: sessionToDelete.data(),
            type: 'single'
        };
        
        // Soft delete the session - just mark it as deleted first
        await firebase.firestore().collection('sessions').doc(sessionId).update({
            deleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        showStatusMessage('Session deleted successfully.', 'success');
        
        // Show toast notification with undo option
        showUndoToast(`Session ${lastDeletedSessionData.data.code || 'Unknown'} deleted`, 'Session Deleted');
        
        // Set timeout to hard delete if undo not clicked
        deleteSessionTimeout = setTimeout(() => {
            hardDeleteSession(sessionId);
        }, 10000); // 10 second timeout
        
        // Refresh the data
        await refreshData();
        
    } catch (error) {
        console.error('Error deleting session:', error);
        showStatusMessage('Error deleting session: ' + error.message, 'error');
    }
}

// Delete all sessions
async function deleteAllSessions() {
    try {
        // Show loading message
        showStatusMessage('Deleting all sessions...', 'info');
        
        const user = firebase.auth().currentUser;
        const sessionsRef = firebase.firestore().collection('sessions');
        const querySnapshot = await sessionsRef.where('createdBy', '==', user.uid).get();
        
        if (querySnapshot.empty) {
            showStatusMessage('No sessions found to delete.', 'info');
            return;
        }
        
        // Store all sessions for undo
        const allSessionsData = [];
        querySnapshot.forEach(doc => {
            allSessionsData.push({
                id: doc.id,
                data: doc.data()
            });
        });
        
        // Store data for undo
        lastDeletedSessionData = {
            sessions: allSessionsData,
            type: 'all'
        };
        
        // Soft delete all sessions
        const batch = firebase.firestore().batch();
        
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, {
                deleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        // Show success message
        showStatusMessage('All sessions deleted successfully.', 'success');
        
        // Show toast notification with undo option
        showUndoToast(`All sessions (${allSessionsData.length}) deleted`, 'Sessions Deleted');
        
        // Set timeout to hard delete if undo not clicked
        deleteSessionTimeout = setTimeout(() => {
            hardDeleteAllSessions(allSessionsData.map(session => session.id));
        }, 10000); // 10 second timeout
        
        // Refresh the data
        await refreshData();
        
    } catch (error) {
        console.error('Error deleting all sessions:', error);
        showStatusMessage('Error deleting sessions: ' + error.message, 'error');
    }
}

// Hard delete a session (permanent deletion)
async function hardDeleteSession(sessionId) {
    try {
        await firebase.firestore().collection('sessions').doc(sessionId).delete();
        console.log('Session permanently deleted:', sessionId);
    } catch (error) {
        console.error('Error hard deleting session:', error);
    }
}

// Hard delete all sessions (permanent deletion)
async function hardDeleteAllSessions(sessionIds) {
    try {
        const batch = firebase.firestore().batch();
        
        sessionIds.forEach(sessionId => {
            const docRef = firebase.firestore().collection('sessions').doc(sessionId);
            batch.delete(docRef);
        });
        
        await batch.commit();
        console.log('All sessions permanently deleted');
    } catch (error) {
        console.error('Error hard deleting all sessions:', error);
    }
}

// Show undo toast notification
function showUndoToast(message, title) {
    const toastContainer = document.getElementById('toast-container');
    
    // Clear any existing toasts
    clearTimeout(deleteSessionTimeout);
    toastContainer.innerHTML = '';
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-actions">
            <button class="toast-undo" aria-label="Undo deletion">UNDO</button>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-progress"></div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Animate progress bar
    const progressBar = toast.querySelector('.toast-progress');
    progressBar.style.animation = 'progress-shrink 10s linear forwards';
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#progress-animation')) {
        const style = document.createElement('style');
        style.id = 'progress-animation';
        style.textContent = `
            @keyframes progress-shrink {
                0% { width: 100%; }
                100% { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);
    
    // Add event listeners
    toast.querySelector('.toast-undo').addEventListener('click', undoSessionDeletion);
    toast.querySelector('.toast-close').addEventListener('click', function() {
        closeToast(toast);
    });
    
    // Auto close after 10 seconds
    setTimeout(() => {
        closeToast(toast);
    }, 10000);
}

// Close toast notification
function closeToast(toast) {
    toast.classList.remove('active');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Undo session deletion
async function undoSessionDeletion() {
    try {
        // Clear any deletion timeout
        clearTimeout(deleteSessionTimeout);
        
        if (!lastDeletedSessionData) {
            return;
        }
        
        showStatusMessage('Restoring session(s)...', 'info');
        
        if (lastDeletedSessionData.type === 'single') {
            // Restore single session
            await firebase.firestore().collection('sessions').doc(lastDeletedSessionData.id).update({
                deleted: false,
                deletedAt: firebase.firestore.FieldValue.delete()
            });
            
            showStatusMessage('Session restored successfully.', 'success');
        } else if (lastDeletedSessionData.type === 'all') {
            // Restore all sessions
            const batch = firebase.firestore().batch();
            
            lastDeletedSessionData.sessions.forEach(session => {
                const docRef = firebase.firestore().collection('sessions').doc(session.id);
                batch.update(docRef, {
                    deleted: false,
                    deletedAt: firebase.firestore.FieldValue.delete()
                });
            });
            
            await batch.commit();
            
            showStatusMessage('All sessions restored successfully.', 'success');
        }
        
        // Reset last deleted data
        lastDeletedSessionData = null;
        
        // Close all toasts
        document.querySelectorAll('.toast').forEach(toast => {
            closeToast(toast);
        });
        
        // Refresh data
        await refreshData();
        
    } catch (error) {
        console.error('Error restoring session(s):', error);
        showStatusMessage('Error restoring session(s): ' + error.message, 'error');
    }
} 