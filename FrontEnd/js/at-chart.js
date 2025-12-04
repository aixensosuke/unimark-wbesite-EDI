// Get reference to the canvas element where the chart will be rendered
let canvasElement = document.getElementById('bar-chart');

// Configure the chart settings and data
let config = {
    // Specify that this will be a bar chart
    type: 'bar',
    data: {
        // X-axis labels (student names)
        labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday","Saturday"],
        
        // The actual data sets to be plotted
        datasets: [
            {
                // First dataset for classes attended
                label: "Number of Classes Attended",
                data: [4,2,3,5,3,2], // Values for each student
                backgroundColor: ["#27BBA9"], // Teal color for attended classes
                borderColor: ["#27BBA9"],
                borderWidth: 1
            },
            {
                // Second dataset for classes missed 
                label: "Number of Classes Missed",
                data: [1,3,2,0,2,3], // Values for each day
                backgroundColor: ["#FF4444"], // Red color for missed classes
                borderColor: ["#FF4444"],
                borderWidth: 1
            }
        ],
    },
};

// Create and render the bar chart using Chart.js
let BarChart = new Chart(canvasElement, config);
