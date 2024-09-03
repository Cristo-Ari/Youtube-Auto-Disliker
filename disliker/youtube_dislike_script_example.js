function getDislikeButton() {
  // Используем одинарные кавычки для обрамления строки, и экранируем двойные кавычки внутри
  return document.querySelector('button.yt-spec-button-shape-next[aria-label="Поставить отметку \\"Не нравится\\""]');
}

function clickDislikeButton() {
  const dislikeButton = getDislikeButton();
  if (dislikeButton) {
    dislikeButton.click(); // Симулируем клик по кнопке дизлайка
  } else {
    console.log('Dislike button not found.');
  }
}

// Вызов функции напрямую
clickDislikeButton();
