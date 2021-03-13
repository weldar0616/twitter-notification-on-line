const MyUtil = new class {
    constructor() {
      this.activeSheet = SpreadsheetApp.getActiveSpreadsheet();
      this.lineChannelToken = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
    }

    getSheetByName(name) {
      return this.activeSheet.getSheetByName(name);
    }

    _getFolder(name) {
        // 予め作っておいたフォルダの情報を取得
        const folders = DriveApp.getFoldersByName(name);        
        while (folders.hasNext()) {
            folder = folders.next();
            if (folder.getName() == folderName) {
                break;
            }
        }
    }

    saveToGDrive(url, fileName, folderName) {
        const response = UrlFetchApp.fetch(url);
        const fileBlob = response.getBlob().setName(fileName);
        const file = DriveApp.createFile(fileBlob);
        const folder = this._getFolder(folderName);
        file.makeCopy(file.getName(), folder);
        file.setTrashed(true);
    }

    saveProfMedia(url, fileName, folderName) {
        this.saveToGDrive(url, fileName, folderName);

        // 一時データスプレッドシートのURLを更新
        const sheet = this.activeSheet.getSheetByName(SHEET_NAME.TMP_DATA);
        let row = 0;
        if (fileNamePrefix == "icon_") {
            row = 2;
        } else if (fileNamePrefix == "header_") {
            row = 3;
        }
        sheet.getRange(row, 2).setValue(url);
    }

    // LINEにmessageを送る
    sendMessage(message) {
        const options = {
            "method": "post",
            "payload": { "message": message },
            "headers": { "Authorization": `Bearer ${this.lineChannelToken}` }
        };
        UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
    }

    // 配列の最大値のインデックスを返す
    maxIndex(arr) {
        let index = 0;
        let value = -Infinity;
        for (let i = 0, l = arr.length; i < l; i++) {
            if (value < arr[i]) {
                value = arr[i];
                index = i;
            }
        }
        return index;
    }
}();
