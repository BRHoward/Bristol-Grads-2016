var google = require("googleapis");
var verifier = require("google-id-token-verifier");
var fs = require("fs");

module.exports = function(oauthClientId, oauthSecret) {
    var OAuth2Client = google.auth.OAuth2;
    var REDIRECT_URL = "http://127.0.0.1:8080/oauth";

    var oauth2Client = new OAuth2Client(oauthClientId, oauthSecret, REDIRECT_URL);

    var oAuthUri = oauth2Client.generateAuthUrl({
        access_type: "offline", // will return a refresh token
        scope: "profile"
    });

    function authorise(req, callback) {
        var code = req.query.code;
        oauth2Client.getToken(code, function (err, tokens) {
            if (!err) {
                //TODO: is this necessary? probs not
                oauth2Client.setCredentials(tokens);
                var IdToken = tokens.id_token;
                verifier.verify(IdToken, oauthClientId, function (err, tokenInfo) {
                    if (!err) {
                        console.log(tokenInfo.sub);
                        getAdminIDs().then(function(data) {
                            if (data.subs.indexOf(tokenInfo.sub) !== -1) {
                                callback(null, tokens.access_token);
                            } else {
                                callback("bad user", null);
                            }
                        }).catch(function(err) {
                            console.log("Error reading admin data: " + err);
                            callback(err, null);
                        });
                    } else {
                        callback(err, null);
                    }
                });
            } else {
                callback(err, null);
            }
        });
    }

    function getAdminIDs() {
        return new Promise(function(resolve, reject) {
            fs.readFile("./server/adminConfig.json", "utf8", function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }

    return {
        authorise: authorise,
        oAuthUri: oAuthUri
    };
};