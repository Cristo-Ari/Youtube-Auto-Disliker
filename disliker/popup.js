document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('logContainer');

    chrome.storage.local.get('logMessages', (result) => {
        const logMessages = result.logMessages || [];
        if (logMessages.length > 0) {
            logContainer.innerHTML = logMessages.map(message => `<p>${message}</p>`).join('');
        } else {
            logContainer.innerHTML = '<p>No log messages yet.</p>';
        }
    });
});
