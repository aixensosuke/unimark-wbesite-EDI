export function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);
    if (element) {
        fetch(filePath)
            .then(response => response.text())
            .then(data => {
                element.innerHTML = data;
            })
            .catch(error => console.error('Error loading component:', error));
    }
}

