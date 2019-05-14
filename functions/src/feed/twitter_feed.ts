// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
// import { DocumentSnapshot, CollectionReference, QueryDocumentSnapshot } from '@google-cloud/firestore';
// import Twitter = require('twitter');
// import { EventContext } from 'firebase-functions';


// const twitterClient = new Twitter({
//     consumer_key: functions.config().twitter.consumer_key,
//     consumer_secret: functions.config().twitter.consumer_secret,
//     access_token_key: functions.config().twitter.access_token_key,
//     access_token_secret: functions.config().twitter.access_token_secret,
// });

// export const streamArtistTwitterFeed = functions.firestore.document("/artists/{$id}").onUpdate((change: functions.Change<DocumentSnapshot>, eventCtx: EventContext) => {
//     change.before()
// });


/*
export const fetchArtistTwitterFeed = functions.https.onCall(async (data, ctx) => {
    const artistUid = data.artistUid;
    const count = data.count;
    const lastTweetId = data.lastTweetId || null;
    const firestore = admin.firestore();
    const artistCollection: CollectionReference = firestore.collection("artists");
    const querySnapshot = await artistCollection.where("uid", "==", artistUid).limit(1).get();
    if (querySnapshot.docs.length == 0) {
        return { success: false, error: "Artist not found." };
    }

    const doc: QueryDocumentSnapshot = querySnapshot.docs[0];
    const artist = doc.data();
    const twitterId = artist["twitterId"];
    if (twitterId == null || twitterId == undefined) {
        return { success: true, result: [] };   // return an empty tweet array if the artist has not yet set up his twitter account
    }

    let params: Twitter.RequestParams;
    if (lastTweetId == null) {
        console.log("Last tweet id is null");
        params = {
            "user_id": twitterId,
            "count": count,
            "exclude_replies": true,
        };
    } else {
        console.log("Last tweet id is NOT null");
        params = {
            "user_id": twitterId,
            "count": count,
            "exclude_replies": true,
            "max_id": lastTweetId,
        };
    }

    try {
        const twitterResponse = await twitterClient.get("statuses/user_timeline", params);
        return { success: true, result: twitterResponse };
    } catch (error) {
        return { success: false, error: `Failed to load twitter feed. ${JSON.stringify(error)}` };
    }

});
*/