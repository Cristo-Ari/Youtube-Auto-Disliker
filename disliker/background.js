const NOTIFICATION_TYPE = 'basic';
const NOTIFICATION_ICON_URL = 'icon_placeholder.png'; 

class NotificationService {
    static createNotification(notificationOptions) {
        chrome.notifications.create(notificationOptions, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error(`Error creating notification: ${chrome.runtime.lastError.message}`);
            }
        });
    }
}

function handleIncomingMessage(message) {
    if (message.type === 'showNotification') {
        const logMessage = `Title: ${message.title || 'Notification'} - Message: ${message.message || 'No message provided'}`;
        
        chrome.storage.local.get('logMessages', (result) => {
            const logMessages = result.logMessages || [];
            logMessages.push(logMessage);
            chrome.storage.local.set({ logMessages: logMessages });
        });
    }
}

chrome.runtime.onMessage.addListener(handleIncomingMessage);
