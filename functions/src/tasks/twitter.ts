import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Twitter = require('twitter');
import moment = require('moment');

export async function loadTwitterFeed(taskId: string, twitterId: string): Promise<boolean> {
    console.log(`Running loadTwitterFeed task # ${taskId}`);
    await admin.firestore().collection("tasks").doc(taskId).update({ status: "running" });

    // get the tweet id of the most recent post
    const snap = await admin.firestore().collection("social_feed").orderBy("feedId", "desc").limit(1).get();
    let lastTweetId = null;
    if (snap.docs.length > 0) {
        const data = snap.docs[0].data();
        lastTweetId = data["feedId"];
    }

    const twitterClient = new Twitter({
        consumer_key: functions.config().twitter.consumer_key,
        consumer_secret: functions.config().twitter.consumer_secret,
        access_token_key: functions.config().twitter.access_token_key,
        access_token_secret: functions.config().twitter.access_token_secret,
    });

    let params: Twitter.RequestParams = {};
    params["user_id"] = twitterId;
    params["count"] = 100;
    params["exclude_replies"] = true;
    params["include_rts"] = false;
    if (lastTweetId) {
        params["since_id"] = lastTweetId;
    }


    const tweets: Twitter.ResponseData = await twitterClient.get("statuses/user_timeline", params)
    const tweetList: any[] = JSON.parse(JSON.stringify(tweets));

    tweetList.forEach(async (tweet: any) => {
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
            created_at: moment(tweet["created_at"], "ddd MMM DD HH:mm:ss Z YYYY").valueOf(),    //Mon Dec 17 16:45:36 +0000 2018
            text: tweet["text"],
            entities: tweet["entities"],
            extended_entities: tweet["extended_entities"] || null,
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

        await admin.firestore().collection("social_feed").add(item).then();
    });
    console.log("added items to social_feed_collection");

    try {
        // schedule another job for this user in the next 5 mimutes
        const newJob = {
            worker: "loadTwitterFeed",
            status: "scheduled",
            performAt: moment().utc().add("5 minutes").valueOf(),
            param: twitterId,
        };
        // save the newly scheduled job
        console.log("Saving new job");
        await admin.firestore().collection("tasks").add(newJob).then();
        console.log("Scheduled new job");
        return true;
    } catch (error) {
        console.log("an error occurred. " + error);
        return false;
    }
}