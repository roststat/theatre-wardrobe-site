/**
 * Бэкенд бронирования для сайта театрального гардероба.
 *
 * Установка:
 * 1. Откройте https://script.google.com и создайте новый проект.
 * 2. Вставьте этот код целиком в Code.gs.
 * 3. Создайте Google Таблицу, скопируйте её ID из URL
 *    (https://docs.google.com/spreadsheets/d/ID_ТУТ/edit) и вставьте ниже.
 * 4. В таблице создайте лист "Брони" с заголовками в первой строке:
 *    Костюм ID | Костюм | Дата с | Дата по | Имя | Телефон | Комментарий | Статус | Время заявки
 * 5. Deploy -> New deployment -> тип "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Скопируйте URL веб-приложения и вставьте его в index.html в SETTINGS.bookingUrl.
 */

const SHEET_ID = 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ';
const SHEET_NAME = 'Брони';

const TELEGRAM_BOT_TOKEN = '8996911505:AAGsyHDnTMfkdUCbZEjdEm7y4S96PYvGMoM';
const TELEGRAM_CHAT_ID = '214662526';

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'busy') {
    const costumeId = String(e.parameter.costume || '');
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const busy = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (String(row[0]) === costumeId && row[7] !== 'Отменена') {
        busy.push({ from: formatDate(row[2]), to: formatDate(row[3]) });
      }
    }

    return jsonResponse({ ok: true, busy: busy });
  }

  return jsonResponse({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.action !== 'book') {
    return jsonResponse({ ok: false, error: 'unknown action' });
  }

  const sheet = getSheet();
  sheet.appendRow([
    data.costumeId,
    data.costumeName,
    data.from,
    data.to,
    data.name,
    data.phone,
    data.comment || '',
    'Новая',
    new Date()
  ]);

  notifyTelegram(
    '🎭 Новая заявка на бронирование\n' +
    'Костюм № ' + data.costumeId + ' — ' + data.costumeName + '\n' +
    'Даты: ' + data.from + ' — ' + data.to + '\n' +
    'Имя: ' + data.name + '\n' +
    'Телефон: ' + data.phone +
    (data.comment ? '\nКомментарий: ' + data.comment : '')
  );

  return jsonResponse({ ok: true });
}

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function formatDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function notifyTelegram(text) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text }),
    muteHttpExceptions: true
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
