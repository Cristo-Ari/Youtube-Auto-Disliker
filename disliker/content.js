const DISLIKE_TIMEOUT_MS = 15000;
const CHECK_DISLIKE_STATUS_DELAY_MS = 10000;
const RETRY_DELAY_MS = 2000;

const RETRY_SEND_NOTIFICATION_DELAY_MS = 5000;

class NotificationSender {
    static pendingNotificationsQueue = [];

    static sendNotification(notificationTitle, notificationMessage, videoTitle, videoUrl) {
        const notificationDetails = {
            type: 'showNotification',
            title: notificationTitle,
            message: `${notificationMessage}\nVideo: ${videoTitle}\nLink: ${videoUrl}`
        };

        try {
            if (NotificationSender.isExtensionContextAvailable()) {
                chrome.runtime.sendMessage(notificationDetails, (response) => {
                    if (chrome.runtime.lastError || response === undefined) {
                        NotificationSender.addNotificationToQueue(notificationDetails);
                    }
                });
            } else {
                NotificationSender.addNotificationToQueue(notificationDetails);
            }
        } catch (error) {
            console.error("Failed to send notification:", error);
            NotificationSender.addNotificationToQueue(notificationDetails);
        }
    }

    static addNotificationToQueue(notificationDetails) {
        NotificationSender.pendingNotificationsQueue.push(notificationDetails);
        NotificationSender.scheduleRetrySending();
    }

    static scheduleRetrySending() {
        setTimeout(() => {
            NotificationSender.retrySendingQueuedNotifications();
        }, RETRY_SEND_NOTIFICATION_DELAY_MS);
    }

    static retrySendingQueuedNotifications() {
        if (!NotificationSender.isExtensionContextAvailable()) {
            NotificationSender.scheduleRetrySending();
            return;
        }

        while (NotificationSender.pendingNotificationsQueue.length > 0) {
            const notificationDetails = NotificationSender.pendingNotificationsQueue.shift();
            chrome.runtime.sendMessage(notificationDetails, (response) => {
                if (chrome.runtime.lastError || response === undefined) {
                    NotificationSender.addNotificationToQueue(notificationDetails);
                }
            });
        }
    }

    static isExtensionContextAvailable() {
        try {
            return chrome && chrome.runtime && chrome.runtime.id;
        } catch (error) {
            console.error("Error checking extension context:", error);
            return false;
        }
    }
}

class DislikeButtonHandler {
    static dislikeButtonSelector = 'button.yt-spec-button-shape-next[aria-label="Поставить отметку \\"Не нравится\\""]';
    static videoTitleSelector = 'h1.title yt-formatted-string';

    static isVideoPage() {
        return window.location.href.includes('/watch');
    }

    static findDislikeButton() {
        return document.querySelector(DislikeButtonHandler.dislikeButtonSelector);
    }

    static getCurrentVideoTitle() {
        const videoTitleElement = document.querySelector(DislikeButtonHandler.videoTitleSelector);
        return videoTitleElement ? videoTitleElement.textContent.trim() : "Unknown Title";
    }

    static clickDislikeButton() {
        if (!DislikeButtonHandler.isVideoPage()) {
            return; // Если это не страница видео, не пытаемся искать кнопку дизлайка
        }

        const currentVideoTitle = DislikeButtonHandler.getCurrentVideoTitle();
        const currentVideoUrl = window.location.href;

        NotificationSender.sendNotification(
            "YouTube Auto Dislike",
            "Attempting to find the dislike button...",
            currentVideoTitle,
            currentVideoUrl
        );

        const dislikeButtonElement = DislikeButtonHandler.findDislikeButton();

        if (dislikeButtonElement) {
            if (DislikeButtonHandler.isDislikeActive(dislikeButtonElement)) {
                NotificationSender.sendNotification(
                    "YouTube Auto Dislike",
                    "Dislike button is already clicked.",
                    currentVideoTitle,
                    currentVideoUrl
                );
                DislikeButtonHandler.markDislikeAsClicked();
                return;
            }

            dislikeButtonElement.click();
            NotificationSender.sendNotification(
                "YouTube Auto Dislike",
                "Dislike button found and clicked.",
                currentVideoTitle,
                currentVideoUrl
            );

            setTimeout(() => DislikeButtonHandler.verifyDislikeClick(dislikeButtonElement), CHECK_DISLIKE_STATUS_DELAY_MS);
        } else {
            NotificationSender.sendNotification(
                "YouTube Auto Dislike",
                "Dislike button not found. Retrying...",
                currentVideoTitle,
                currentVideoUrl
            );
            setTimeout(DislikeButtonHandler.clickDislikeButton, RETRY_DELAY_MS);
        }
    }

    static verifyDislikeClick(dislikeButtonElement) {
        const currentVideoTitle = DislikeButtonHandler.getCurrentVideoTitle();
        const currentVideoUrl = window.location.href;

        if (DislikeButtonHandler.isDislikeActive(dislikeButtonElement)) {
            NotificationSender.sendNotification(
                "YouTube Auto Dislike",
                "Dislike button was successfully clicked.",
                currentVideoTitle,
                currentVideoUrl
            );
            DislikeButtonHandler.markDislikeAsClicked();
        } else {
            NotificationSender.sendNotification(
                "YouTube Auto Dislike",
                "Dislike button was not clicked. Retrying...",
                currentVideoTitle,
                currentVideoUrl
            );
            setTimeout(DislikeButtonHandler.clickDislikeButton, RETRY_DELAY_MS);
        }
    }

    static isDislikeActive(dislikeButtonElement) {
        return dislikeButtonElement.getAttribute('aria-pressed') === 'true';
    }

    static markDislikeAsClicked() {
        const videoUrl = window.location.href;
        chrome.storage.local.set({ [videoUrl]: true });
    }

    static checkIfVideoDisliked(callback) {
        const videoUrl = window.location.href;
        chrome.storage.local.get([videoUrl], (dislikeStatus) => {
            callback(!!dislikeStatus[videoUrl]);
        });
    }

    static setupDislikeForNewVideo() {
        if (!DislikeButtonHandler.isVideoPage()) {
            return; // Если это не страница видео, выходим из функции
        }

        DislikeButtonHandler.checkIfVideoDisliked((isDisliked) => {
            if (!isDisliked) {
                setTimeout(() => {
                    DislikeButtonHandler.clickDislikeButton();
                }, DISLIKE_TIMEOUT_MS);
            } else {
                const currentVideoTitle = DislikeButtonHandler.getCurrentVideoTitle();
                const currentVideoUrl = window.location.href;
                
                NotificationSender.sendNotification(
                    "YouTube Auto Dislike",
                    "Dislike has already been set for this video.",
                    currentVideoTitle,
                    currentVideoUrl
                );
            }
        });
    }
}

let lastProcessedVideoUrl = window.location.href;

function handleVideoChange() {
    const currentVideoUrl = window.location.href;

    if (currentVideoUrl !== lastProcessedVideoUrl) {
        lastProcessedVideoUrl = currentVideoUrl;

        if (DislikeButtonHandler.isVideoPage()) {
            const currentVideoTitle = DislikeButtonHandler.getCurrentVideoTitle();
            NotificationSender.sendNotification(
                "YouTube Auto Dislike",
                "Video changed. Setting up dislike for the new video.",
                currentVideoTitle,
                currentVideoUrl
            );
            
            DislikeButtonHandler.setupDislikeForNewVideo();
        }
    }
}

const videoChangeObserver = new MutationObserver(() => {
    const newVideoElement = document.querySelector('video');
    if (newVideoElement) {
        handleVideoChange();
    }
});

videoChangeObserver.observe(document.body, { childList: true, subtree: true });

DislikeButtonHandler.setupDislikeForNewVideo();
