const SCREEN_NAME = "[監視対象のTwitterスクリーンID]";

// トリガー呼び出し関数
function startNotification() {
  update();
}

const update = () => {
  notifyFollowsUpdated();
  notifyIconUpdated();
  notifyHeaderUpdated();
  notifyFavoritesUpdated();
  notifyBioUpdated();
  notifyTimelineUpdated();
  notifyNewSearchedTweets();
  updateNewRepliedTweets();
};

const _fetchIconUrl = () => {
  const url = Twitter.showUser(SCREEN_NAME)["profile_image_url_https"];
  if (url == null) return "";
  return String(url).replace("_normal", "");
};

const _fetchHeadeUrl = () => {
  const url = Twitter.showUser(SCREEN_NAME)["profile_banner_url"];
  if (url == null) return "";
  return `${String(url)}/1500x500`;
};

const notifyFollowsUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.TMP_DATA);
  const lastUpdateFollows = sheet.getRange(1, 2).getValue();
  const follows = Twitter.showUser(SCREEN_NAME)["friends_count"];
  if (lastUpdateFollows <= follows || !follows) return;

  const now = Utilities.formatDate(
    new Date(),
    "JST",
    "yyyy/MM/dd (E) HH:mm:ss"
  );
  sendMessage(
    `[フォロー推移時の文言] : ${lastUpdateFollows} -> ${follows} \n${now}`
  );
  sheet.getRange(1, 2).setValue(follows);
};

const notifyIconUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.TMP_DATA);
  const lastUpdateUrl = sheet.getRange(2, 2).getValue();
  const currentUrl = _fetchIconUrl();
  if (!currentUrl || currentUrl === lastUpdateUrl) return;

  const now = Utilities.formatDate(new Date(), "JST", "yyyyMMdd");
  const fileName = `icon_${now}`;
  saveProfMedia(currentUrl, fileName, FOLDER_NAME.ICON_HEADER);
  sendMessage(`[アイコン更新時の文言]\n ${currentUrl}`);
};

const notifyHeaderUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.TMP_DATA);
  const lastUpdateUrl = sheet.getRange(3, 2).getValue();
  const currentUrl = _fetchHeadeUrl();
  if (!currentUrl || currentUrl === lastUpdateUrl) return;

  const now = Utilities.formatDate(new Date(), "JST", "yyyyMMdd");
  const fileName = `header_${now}`;
  saveProfMedia(currentUrl, fileName, FOLDER_NAME.ICON_HEADER);
  sendMessage(`[ヘッダー更新時の文言]\n ${currentUrl}`);
};

const notifyFavoritesUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.TMP_DATA);
  const favCount = Twitter.showUser(SCREEN_NAME)["favourites_count"];
  const lastUpdateFavCount = sheet.getRange(4, 2).getValue();
  if (!favCount || favCount === lastUpdateFavCount) return;
  if (favCount <= lastUpdateFavCount) return;

  sheet.getRange(4, 2).setValue(favCount);
  // 最新のfavから増加分を取得する
  const count = favCount - lastUpdateFavCount;
  const favorites = Twitter.favorites(SCREEN_NAME, count);
  let message = `[いいね更新時の文言]\n${lastUpdateFavCount}->${favCount}\n\n`;
  for (const favorite of favorites) {
    const tweetId = favorite["id_str"];
    const userId = favorite["user"]["screen_name"];
    const tweetUrl = `https://twitter.com/${userId}/status/${tweetId}`;
    message = message + tweetUrl + "\n";
  }
  sendMessage(message);
};

const notifyBioUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.PROF_TRANS);
  const today = Utilities.formatDate(
    new Date(),
    "JST",
    "yyyy/MM/dd (E) HH:mm:ss"
  );
  const row = sheet.getLastRow() + 1;
  const lastUpdateUsername = sheet.getRange(row - 1, 2).getValue();
  const lastUpdateBio = sheet.getRange(row - 1, 3).getValue();

  // ユーザ名・bioに変化があれば通知
  const username = Twitter.showUser(SCREEN_NAME)["name"];
  const bio = Twitter.showUser(SCREEN_NAME)["description"];

  // TODO: 整理
  if (
    (username !== lastUpdateUsername && username !== null) ||
    (bio !== lastUpdateBio && bio !== null)
  ) {
    let message = "";
    if (username !== lastUpdateUsername) {
      message = `[ユーザー名更新時の文言]\n${lastUpdateUsername}->${username}`;
      sheet.getRange(row, 1).setValue(today);
      sheet.getRange(row, 2).setValue(username);
      sheet.getRange(row, 3).setValue(lastUpdateBio);
    } else if (bio !== lastUpdateBio) {
      message = `[bio更新時の文言]\n${lastUpdateBio}->${bio}`;
      sheet.getRange(row, 1).setValue(today);
      sheet.getRange(row, 2).setValue(lastUpdateUsername);
      sheet.getRange(row, 3).setValue(bio);
    }
    sendMessage(message);
  }
};

const notifyTimelineUpdated = () => {
  const sheet = getSheetByName(SHEET_NAME.TWEETS_DATA);
  const firstTweetId = "[SCREEN_NAMEで指定したユーザーの最初のツイートのID]";
  const tweets = Twitter.userTimeLine(SCREEN_NAME, firstTweetId);
  const keys = [];
  // TODO: 整理
  for (const key in tweets) {
    keys.push(key);
  }
  const reverseKeys = keys.reverse();
  let i = 0;
  for (const t in tweets) {
    const key = reverseKeys[i];
    const tweet = tweets[key];
    const lastRow = sheet.getLastRow();
    const row = lastRow + 1;

    const createDate = tweet["created_at"];
    const tweetId = tweet["id"];
    const text = tweet["full_text"];
    const lastTweetId = sheet.getRange(lastRow, 2).getValue();
    if (lastTweetId < tweetId) {
      sheet.getRange(row, 1).setValue(createDate);
      sheet.getRange(row, 2).setValue(tweetId);
      sheet.getRange(row, 3).setValue(text);

      let message = `[ツイート更新時の文言]\n${text}`;
      // 画像・動画を保存
      const extendedEntities = tweet.extended_entities;
      if (extendedEntities) {
        message += "\n----\n";
        const mediaType = extendedEntities.media[0].type;
        if (mediaType == "video") {
          const media = extendedEntities.media[0];
          const variants = media.video_info.variants;
          // variantsからbitrateが一番高いファイルのURLを取得
          const mediaUrl =
            variants[maxIndex(variants.map((v) => v.bitrate))].url;
          saveToGDrive(
            mediaUrl,
            `tweet_media_${tweetId}`,
            FOLDER_NAME.TWEET_MEDIA
          );
          message += mediaUrl;
        } else if (mediaType == "photo") {
          const mediaUrls = extendedEntities.media.map(
            (v) => v.media_url + ":large"
          );
          if (1 < mediaUrls.length) var mediaCount = 1;
          for (const mediaUrl of mediaUrls) {
            let name = `tweet_media_${tweetId}`;
            if (mediaCount) name += `_${mediaCount++}`;
            saveToGDrive(mediaUrl, name, FOLDER_NAME.TWEET_MEDIA);
          }
          message += mediaUrls.join(" \n");
        }
      }
      sendMessage(message);
    }
    i++;
  }
};

const notifyNewSearchedTweets = (query = "[検索クエリ]") => {
  const sheet = getSheetByName(SHEET_NAME.SEARCH_RESULT);
  const result = Twitter.search(query);
  const statuses = result["statuses"];
  statuses.reverse().forEach((status) => {
    const lastRow = sheet.getLastRow();
    const row = lastRow + 1;

    const createDate = status["created_at"];
    const tweetId = status["id"];
    const text = status["text"];
    const user = status["user"];
    const userId = user["screen_name"];
    const userName = user["name"];
    const lastTweetId = sheet.getRange(lastRow, 2).getValue();
    if (lastTweetId < tweetId) {
      sheet.getRange(row, 1).setValue(createDate);
      sheet.getRange(row, 2).setValue(tweetId);
      sheet.getRange(row, 3).setValue(userId);
      sheet.getRange(row, 4).setValue(userName);
      sheet.getRange(row, 5).setValue(text);

      const tweetIdStr = status["id_str"];
      const tweetUrl = `https://twitter.com/${userId}/status/${tweetIdStr}`;
      if (tweetUrl != null) {
        sendMessage(`[検索結果更新時の文言]\n${text}\n#########\n${tweetUrl}`);
      }
    }
  });
};

const updateNewRepliedTweets = (query = `@${SCREEN_NAME} -rt`) => {
  const sheet = getSheetByName(SHEET_NAME.REPLAY_DATA);
  const result = Twitter.search(query);
  const statuses = result["statuses"];
  statuses.reverse().forEach((status) => {
    const lastRow = sheet.getLastRow();
    const row = lastRow + 1;

    const createDate = status["created_at"];
    const tweetId = status["id"];
    const text = status["text"];
    const user = status["user"];
    const userId = user["screen_name"];
    const userName = user["name"];
    const lastTweetId = sheet.getRange(lastRow, 2).getValue();
    if (lastTweetId < tweetId) {
      sheet.getRange(row, 1).setValue(createDate);
      sheet.getRange(row, 2).setValue(tweetId);
      sheet.getRange(row, 3).setValue(userId);
      sheet.getRange(row, 4).setValue(userName);
      sheet.getRange(row, 5).setValue(text);
    }
  });
};

/**
 * misc
 */
function getSheetByName(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// 配列の最大値のインデックスを返す
function maxIndex(arr) {
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
