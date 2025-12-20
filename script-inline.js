// Security: Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>"'&]/g, function(match) {
            const map = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return map[match];
        })
        .trim()
        .substring(0, 200);
}

// Enhanced error handling for DOM elements
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn('Element with id "' + id + '" not found');
    }
    return element;
}

// Make functions globally available
window.sanitizeInput = sanitizeInput;
window.safeGetElement = safeGetElement;