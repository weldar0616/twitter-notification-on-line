function saveToGDrive(url, fileName, folderName) {
  const getFolder = (name) => {
    const folders = DriveApp.getFoldersByName(name);
    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getName() === folderName) {
        break;
      }
    }
  };
  const response = UrlFetchApp.fetch(url);
  const fileBlob = response.getBlob().setName(fileName);
  const file = DriveApp.createFile(fileBlob);
  const folder = getFolder(folderName);
  file.makeCopy(file.getName(), folder);
  file.setTrashed(true);
}

function saveProfMedia(url, fileName, folderName) {
  saveToGDrive(url, fileName, folderName);

  // 一時データスプレッドシートのURLを更新
  const sheet = getSheetByName(SHEET_NAME.TMP_DATA);
  const row =
    fileNamePrefix === "icon_" ? 2 : fileNamePrefix === "header_" ? 3 : 0;
  sheet.getRange(row, 2).setValue(url);
}
