// import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
// import { DocumentReference, CollectionReference, QueryDocumentSnapshot } from '@google-cloud/firestore';
// import * as twt from 'twitter';

// /// Activates a firebase auth user
// export const fetchArtistTwitterFeed = functions.https.onCall(async (data, context) => {
//     const uid = data.artistUid;

//     // const auth = admin.auth();
//     // const updateRequest: admin.auth.UpdateRequest = {
//     //     emailVerified: true
//     // };

//     // try {
//     //     const userRecord: admin.auth.UserRecord = await auth.updateUser(uid, updateRequest);
//     //     return { success: true, uid: userRecord.uid };
//     // } catch (error) {
//     //     const errMessage = `Failed to update firebase user: ${error}`;
//     //     console.log();
//     //     return { success: false, error: errMessage };
//     // }

//     // get the artist object and then get his twitter uid
//     try {
//         const firestore = admin.firestore();
//         const artistCollection: CollectionReference = firestore.collection("artists");
//         let querySnapshot = await artistCollection.where("uid", "==", uid).limit(1).get()
//         if (querySnapshot.docs.length === 0) {
//             return { success: false, error: "Artist not found" };
//         }
//         const doc: QueryDocumentSnapshot = querySnapshot.docs[0];
//         const artist = doc.data();
//         const twitterId = artist["twitterId"];
//         if (twitterId == null || twitterId == undefined) {
//             return { success: true, result: [] };
//         }

//         // const config = functions.config();

//         // twt.prototype.get("search/tweets", {q: `from:${twitterId}`}, (error: any, data: twt.ResponseData, response) => {

//         // });
//         return null;

//     } catch (error) {
//         return null;
//     }
// });