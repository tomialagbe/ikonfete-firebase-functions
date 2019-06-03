import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Twitter = require('twitter');
import moment = require('moment');

import * as artistRepo from '../repository/artist';
import * as fanRepo from '../repository/fan';

export const loadFanSocialMediaFeed = functions.https.onCall(async (data, context) => {
    const fanUid = data.fanUid;
    const accessToken = data.twitter.accessToken;
    const accessTokenSecret = data.twitter.accessTokenSecret;
    const consumerKey = data.twitter.consumerKey;
    const consumerSecret = data.twitter.consumerSecret;
    const maxId = data.twitter.maxId;
    const sinceId = data.twitter.sinceId;
    const count = data.twitter.count || 50;

    // fetch the artist
    const firestore = admin.firestore();
    const fan = await fanRepo.findFanByUid(fanUid, firestore);
    if (fan === null || fan.currentTeamId === null || fan.currentTeamId === undefined) {
        return {
            "success": false,
            "error": "Fan not found"
        };
    }

    const artistId = fan.currentTeamId;
    const artist = await artistRepo.findArtistById(artistId, firestore);
    if (artist === null) {
        return {
            "success": false,
            "error": "Artist not found"
        };
    }

    // call respective APIs
    const socialFeedItems: Array<socialFeedItem> = [];
    const p1 = _loadTwitterFeed(artist.twitterId, { accessToken, accessTokenSecret, consumerKey, consumerSecret, maxId, sinceId, count });
    const p2 = _loadFacebookFeed(artist.facebookId, {});
    const result = await Promise.all([p1, p2]);
    result.forEach((r) => {
        if (r !== null) {
            socialFeedItems.push(...r);
        }
    });

    socialFeedItems.sort((a, b) => {
        if (b.createdAt > a.createdAt) return 1;
        else if (b.createdAt < a.createdAt) return -1;
        return 0;
    });
    return {
        "success": true,
        "result": socialFeedItems
    }
});

interface twitterApiParams {
    accessToken: string
    accessTokenSecret: string
    consumerKey: string
    consumerSecret: string
    maxId?: number
    sinceId: number
    count?: number
}

interface socialFeedItem {
    type: string
    feedId: string
    createdAt: number
    [index: string]: any
}

async function _loadTwitterFeed(twitterId: string, params: twitterApiParams): Promise<Array<socialFeedItem> | null> {
    const twitterClient = new Twitter({
        access_token_key: params.accessToken,
        access_token_secret: params.accessTokenSecret,
        consumer_key: params.consumerKey,
        consumer_secret: params.consumerSecret,
    });

    const reqParams: Twitter.RequestParams = {};
    reqParams["user_id"] = twitterId;
    reqParams["count"] = params.count || 50;
    reqParams["exclude_replies"] = true;
    if (params.sinceId) {
        reqParams["since_id"] = params.sinceId;
    }
    if (params.maxId) {
        reqParams["max_id"] = params.maxId;
    }

    try {
        const tweets: Twitter.ResponseData = await twitterClient.get("statuses/user_timeline", reqParams);
        const feedItems = _parseTwitterResponseData(twitterId, tweets);
        return feedItems;
    } catch (error) {
        console.log("An error occurred while trying to fetch twitter feed.\n" + JSON.stringify(error));
        console.log("An error occurred while trying to fetch twitter feed.\n" + error);
        return null;
    }
}

function _parseTwitterResponseData(twitterId: string, tweets: Twitter.ResponseData): Array<socialFeedItem> {
    const tweetList: any[] = JSON.parse(JSON.stringify(tweets));

    const feedItems: Array<socialFeedItem> = [];
    tweetList.forEach((tweet: any) => {
        const is_retweet = tweet["text"].startsWith("RT")
        const retweet_status = tweet["retweeted_status"];
        let retweeted_by = null;
        if (retweet_status) {
            retweeted_by = retweet_status.user;
        }
        const item = {
            type: "twitter",
            feedId: tweet["id"],
            created_at_str: tweet["created_at"],
            createdAt: moment(tweet["created_at"], "ddd MMM DD HH:mm:ss Z YYYY").valueOf(),    //Mon Dec 17 16:45:36 +0000 2018
            text: tweet["text"],
            entities: tweet["entities"],
            user_id: twitterId,
            user: tweet["user"],
            is_retweet: is_retweet,
            retweeted_from: retweeted_by,
            is_quote_status: tweet["is_quote_status"],
            retweet_count: tweet["retweet_count"],
            favorite_count: tweet["favorite_count"],
            favorited: tweet["favorited"],
            retweeted: tweet["retweeted"],
        }
        feedItems.push(item);
    });
    return feedItems;
}

interface facebookApiParams { }

async function _loadFacebookFeed(facebookId: string, params: facebookApiParams): Promise<Array<socialFeedItem> | null> {
    return null;
}