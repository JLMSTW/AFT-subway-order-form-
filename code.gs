/**
 * Subway 訂餐後台 - Google Apps Script
 * 功能：接收網站送來的訂單 → 寫入 Google Sheet → 寄確認信
 *
 * 部署步驟：
 * 1. 開啟 Google Sheet → 擴充功能 → Apps Script
 * 2. 貼上此程式碼，按儲存
 * 3. 點「部署」→「新增部署作業」
 * 4. 類型選「網頁應用程式」
 * 5. 執行身分：「我」/ 存取權限：「任何人」
 * 6. 部署後複製 Web App URL
 * 7. 貼到 index.html 的 APPS_SCRIPT_URL 變數
 */

const SHEET_NAME = '訂餐記錄';

// ── 處理 POST 請求（網站送出時呼叫）────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    writeToSheet(data);
    sendConfirmationEmail(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 處理 GET（測試用）──────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput('✅ Subway Order API is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── 寫入試算表 ─────────────────────────────────────────
function writeToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // 第一次：建立表頭
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      '編號', '時間戳記', '名字', 'LINE名稱', 'Email',
      '主餐', '麵包', '起司', '蔬菜', '醃製物', '醬汁'
    ]);
    // 凍結表頭
    sheet.setFrozenRows(1);
    // 設定表頭樣式
    var header = sheet.getRange(1, 1, 1, 11);
    header.setBackground('#1a7640');
    header.setFontColor('white');
    header.setFontWeight('bold');
  }

  var lastRow = sheet.getLastRow();
  var orderNum = lastRow;

  var timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy/MM/dd HH:mm:ss'
  );

  sheet.appendRow([
    orderNum,
    timestamp,
    data.name    || '',
    data.line    || '',
    data.email   || '',
    data.main    || '',
    data.bread   || '',
    data.cheese  || '',
    data.vegi    || '',
    data.pickle  || '',
    data.sauce   || ''
  ]);

  sheet.autoResizeColumns(1, 11);
}

// ── 寄確認信 ───────────────────────────────────────────
function sendConfirmationEmail(data) {
  if (!data.email) return;

  var lang = data.lang || 'zh';
  var timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy/MM/dd HH:mm'
  );

  // 多語標題
  var subjects = {
    zh: '🥖 你的 Subway 訂餐確認',
    en: '🥖 Your Subway Order Confirmation',
    fr: '🥖 Confirmation de votre commande Subway'
  };

  var greetings = {
    zh: '您好 ' + data.name + '！\n\n以下是您的訂餐內容，請確認：',
    en: 'Hi ' + data.name + '!\n\nHere is your order summary:',
    fr: 'Bonjour ' + data.name + ' !\n\nVoici le récapitulatif de votre commande :'
  };

  var footers = {
    zh: '⚠️ 送出後無法修改，如有問題請聯絡活動負責人。\n\n感謝您的填寫！',
    en: '⚠️ Orders cannot be modified after submission. Please contact the organiser if you have any issues.\n\nThank you!',
    fr: '⚠️ La commande ne peut pas être modifiée après envoi. Contactez l\'organisateur en cas de problème.\n\nMerci !'
  };

  var labels = {
    zh: { main:'主餐', bread:'麵包', cheese:'起司', vegi:'蔬菜', pickle:'醃製物', sauce:'醬汁', time:'填表時間' },
    en: { main:'Main Dish', bread:'Bread', cheese:'Cheese', vegi:'Vegetables', pickle:'Pickles', sauce:'Sauce', time:'Submitted at' },
    fr: { main:'Plat principal', bread:'Pain', cheese:'Fromage', vegi:'Légumes', pickle:'Condiments', sauce:'Sauce', time:'Soumis le' }
  };

  var L = labels[lang] || labels['zh'];

  // Plain text
  var rows = [
    [L.main,   data.main],
    [L.bread,  data.bread],
    [L.cheese, data.cheese],
    [L.vegi,   data.vegi],
    [L.pickle, data.pickle],
    [L.sauce,  data.sauce],
  ];

  var orderText = rows.map(function(r) {
    return '▸ ' + r[0] + '：' + r[1];
  }).join('\n');

  var body =
    (greetings[lang] || greetings['zh']) + '\n\n' +
    '────────────────────\n' +
    orderText + '\n' +
    '────────────────────\n\n' +
    '📌 ' + L.time + '：' + timestamp + '\n\n' +
    (footers[lang] || footers['zh']);

  // HTML version
  var tableRows = rows.map(function(r) {
    return '<tr>' +
      '<td style="padding:9px 14px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:38%;color:#374151;">' + r[0] + '</td>' +
      '<td style="padding:9px 14px;border:1px solid #e5e7eb;color:#111827;">' + r[1] + '</td>' +
      '</tr>';
  }).join('');

  var greetingHtml = (greetings[lang] || greetings['zh']).replace(/\n/g, '<br>');
  var footerHtml   = (footers[lang]   || footers['zh']).replace(/\n/g, '<br>');

  var htmlBody =
    '<div style="font-family:\'DM Sans\',sans-serif;max-width:520px;margin:auto;background:#faf9f6;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">' +
    '<div style="background:#1a7640;padding:20px 24px;">' +
    '<p style="font-family:Georgia,serif;color:white;font-size:1.3rem;margin:0;">🥖 Subway Order</p>' +
    '</div>' +
    '<div style="padding:24px;">' +
    '<p style="color:#374151;line-height:1.7;margin-bottom:20px;">' + greetingHtml + '</p>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:20px;">' + tableRows + '</table>' +
    '<p style="font-size:0.85rem;color:#6b7280;">📌 ' + L.time + '：' + timestamp + '</p>' +
    '<p style="font-size:0.85rem;color:#dc2626;margin-top:12px;">' + footerHtml + '</p>' +
    '</div>' +
    '</div>';

  MailApp.sendEmail({
    to:       data.email,
    subject:  subjects[lang] || subjects['zh'],
    body:     body,
    htmlBody: htmlBody
  });
}
