const LINE_CHANNEL_ACCESS_TOKEN =
  PropertiesService.getScriptProperties().getProperty(
    "LINE_CHANNEL_ACCESS_TOKEN"
  );

// LINEにmessageを送る
function sendMessage(message) {
  const options = {
    method: "post",
    payload: { message: message },
    headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
  };
  UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
}
