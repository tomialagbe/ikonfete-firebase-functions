import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const incrementFeedItemCommentCount = functions.firestore.document("social_feed/{feedId}/social_feed_comments/{commentId}")
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        const feedId = context.params.feedId;
        const commentId = context.params.commentId;
        if (data) {
            console.log("FEED COMMENT ADDED FOR FEED ITEM " + data.authorName + " with ID " + snapshot.id);
            console.log("FEED ID " + feedId + " COMMENT ID " + commentId);
            // find the feed item and update the comment count "num_comments"
            const firestore = admin.firestore();
            const docRef = await firestore.collection("social_feed").doc(feedId);//.collection("social_feed_comments")
            const docSnap = await docRef.get();
            let numComments = 0;
            const docData = docSnap.data()
            if (docData && docData.num_comments) {
                numComments = docData.num_comments;
            }
            numComments = numComments + 1;
            console.log("INCREMENTED NUMBER OF COMMENTS FOR " + data.authorName + ": " + numComments)
            await docRef.update({
                "num_comments": numComments,
            });
            return { success: true };
        }
        return { success: false };
    });

export const decrementFeedItemCommentCount = functions.firestore.document("social_feed/{feedId}/social_feed_comments/{commentId}")
    .onDelete(async (snapshot, context) => {
        const data = snapshot.data();
        const feedId = context.params.feedId;
        const commentId = context.params.commentId;
        if (data) {
            console.log("FEED COMMENT DELETED FOR FEED ITEM " + data.authorName + " with ID " + snapshot.id);
            console.log("FEED ID " + feedId + " COMMENT ID " + commentId);
            const firestore = admin.firestore();
            const docRef = await firestore.collection("social_feed").doc(feedId);
            const docSnap = await docRef.get();
            const docData = docSnap.data();
            let numComments = 0;
            if (docData && docData.num_comments) {
                numComments = docData.num_comments;
            }
            numComments = numComments > 0 ? numComments - 1 : 0;
            console.log("DECREMENTED NUMBER OF COMMENTS FOR " + data.authorName + ": " + numComments)
            await docRef.update({
                "num_comments": numComments,
            });
            return { success: true };
        }
        return { success: false };
    });