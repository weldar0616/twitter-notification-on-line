
function twitterAuthorizeUrl() {
  Twitter.oauth.showUrl();
}

// OAuth認証成功後のコールバック関数
function twitterAuthorizeCallback(request) {
  return Twitter.oauth.callback(request);
}

// OAuth認証のキャッシュをを削除する場合に実行（実行後は再度認証が必要）
function twitterAuthorizeClear() {
  Twitter.oauth.clear();
}

class MyOAuth {
  constructor() {
    this.name = "twitter";
  }

  service(screen_name) {
    // 参照元：https://github.com/googlesamples/apps-script-oauth2
    return OAuth1.createService(this.name)
      // Set the endpoint URLs.
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')

      // Set the consumer key and secret.
      .setConsumerKey(this.parent.consumerKey)
      .setConsumerSecret(this.parent.consumerSecret)

      // Set the project key of the script using this library.
      //.setProjectKey(this.parent.projectKey)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('twitterAuthorizeCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
  }

  showUrl() {
    const service = this.service();
    if (!service.hasAccess()) {
      Logger.log(service.authorize());
    } else {
      Logger.log("認証済みです");
    }
  }

  callback(request) {
    const service = this.service();
    const isAuthorized = service.handleCallback(request);
    if (isAuthorized) {
      return HtmlService.createHtmlOutput("認証に成功しました。このタブは閉じて構いません。");
    } else {
      return HtmlService.createHtmlOutput("認証に失敗しました");
    }
  }

  clear() {
    OAuth1.createService(this.name)
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
  }
}

const Twitter = new class {
  constructor() {
    this.projectKey = PropertiesService.getScriptProperties().getProperty("PROJECT_KEY");
    this.consumerKey = PropertiesService.getScriptProperties().getProperty("API_KEY");
    this.consumerSecret = PropertiesService.getScriptProperties().getProperty("API_SECRET");
    this.apiUrl = "https://api.twitter.com/1.1/";

    this.oauth = new MyOAuth();
    this.oauth.parent = this;
  }

  api(path, data) {
    const that = this, service = this.oauth.service();
    if (!service.hasAccess()) {
      Logger.log("先にOAuth認証してください");
      return false;
    }

    path = path.toLowerCase().replace(/^\//, '').replace(/\.json$/, '');

    const method = (
      /^statuses\/(destroy\/\d+|update|retweet\/\d+)/.test(path)
      || /^media\/upload/.test(path)
      || /^direct_messages\/(destroy|new)/.test(path)
      || /^friendships\/(create|destroy|update)/.test(path)
      || /^account\/(settings|update|remove)/.test(path)
      || /^blocks\/(create|destroy)/.test(path)
      || /^mutes\/users\/(create|destroy)/.test(path)
      || /^favorites\/(destroy|create)/.test(path)
      || /^lists\/[^\/]+\/(destroy|create|update)/.test(path)
      || /^saved_searches\/(create|destroy)/.test(path)
      || /^geo\/place/.test(path)
      || /^users\/report_spam/.test(path)
    ) ? "post" : "get";

    let url = this.apiUrl + path + ".json";
    const options = {
      method: method,
      muteHttpExceptions: true
    };

    if ("get" === method) {
      if (!this.isEmpty(data)) {
        url += '?' + Object.keys(data).map(key => that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key])).join('&');
      }
    } else if ("post" == method) {
      if (!this.isEmpty(data)) {
        options.payload = Object.keys(data).map(key => that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key])).join('&');

        if (data.media) {
          options.contentType = "multipart/form-data;charset=UTF-8";
        }
      }
    }

    try {
      const result = service.fetch(url, options);
      const json = JSON.parse(result.getContentText());
      if (!json) throw new Error();
      if (json.error) {
        throw new Error(json.error + " (" + json.request + ")");
      } else if (json.errors) {
        const err = [];
        for (let i = 0, l = json.errors.length; i < l; i++) {
          const error = json.errors[i];
          err.push(error.message + " (code: " + error.code + ")");
        }
        throw new Error(err.join("\n"));
      } else {
        return json;
      }
    } catch (e) {
      this.error(e);
    }

    return false;
  }

  error(error) {
    let message = null;
    if ('object' === typeof error && error.message) {
      message = error.message + " ('" + error.fileName + '.gs:' + error.lineNumber + ")";
    } else {
      message = error;
    }
    Logger.log(message);
  }

  isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length > 0) return false;
    if (obj.length === 0) return true;
    for (const key in obj) {
      if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
  }

  encodeRfc3986(str) {
    return encodeURIComponent(str).replace(/[!'()]/g, (char) => escape(char)).replace(/\*/g, "%2A");
  }

  // *** TwitterAPI ***

  // ユーザ情報の取得
  showUser(screen_name) {
    const data = { screen_name: screen_name };
    return this.api("users/show", data);
  }

  // ユーザ名の変更
  rename(username) {
    const data = { name: username };
    return this.api("account/update_profile", data);
  }

  // いいね取得
  favorites(screen_name, count) {
    const data = {};
    data.screen_name = screen_name;
    data.count = count;
    data.include_entities = false;
    return this.api("favorites/list", data);
  }

  // ツイート検索
  search(data) {
    if ("string" === typeof data) {
      data = { q: data };
    }
    return this.api("search/tweets", data);
  };

  // 自分のタイムライン取得
  timeLine(since_id) {
    let data = null;
    if ("number" === typeof since_id || /^\d+$/.test('' + since_id)) {
      data = { since_id: since_id };
    } else if ("object" === typeof since_id) {
      data = since_id;
    }
    return this.api("statuses/home_timeline", data);
  };

  // ユーザーのタイムライン取得
  userTimeLine(user, since_id, count = 10) {
    let path = "statuses/user_timeline";
    const data = {};
    data.count = count; // 取得する数（最大数）
    data.include_rts = false; // RTを含めるか
    data.tweet_mode = 'extended';

    if (user) {
      if (/^\d+$/.test(user)) {
        data.user_id = user;
      } else {
        data.screen_name = user;
      }
    } else {
      path = "statuses/home_timeline";
    }
    if (since_id) {
      data.since_id = since_id;
    }
    return this.api(path, data);
  };

  // ツイートする
  tweet(data, reply) {
    let path = "statuses/update";
    if ("string" === typeof data) {
      data = { status: data };
    } else if (data.media) {
      path = "statuses/update_with_media ";
    }
    if (reply) {
      data.in_reply_to_status_id = reply;
    }
    return this.api(path, data);
  };
}();
