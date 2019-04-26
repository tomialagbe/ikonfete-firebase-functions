import * as functions from 'firebase-functions';
import { Firestore, CollectionReference, QueryDocumentSnapshot, WriteResult } from '@google-cloud/firestore';
import moment = require('moment');
// import { firestore } from 'firebase-admin';

interface Pair<F, S> {
    first: F;
    second: S;
}

export const onArtistStatusChanged = functions.database.ref("/status/artists/{userId}")
    .onUpdate((change, ctx) => _handleUserStatusChanged(change, ctx, true));

export const onFanStatusChanged = functions.database.ref("/status/fans/{userId}")
    .onUpdate((change, ctx) => _handleUserStatusChanged(change, ctx, false));

function _handleUserStatusChanged(change: functions.Change<functions.database.DataSnapshot>, ctx: functions.EventContext, isArtist: boolean): boolean {
    console.log("Update recieved");
    if (ctx.auth === undefined || change.after === undefined || !change.after.exists()) {
        return false;
    }
    const uid = ctx.auth.uid;
    const status = change.after.val();

    console.log("Handling update");

    const firestore = new Firestore();

    const ref: CollectionReference = firestore.collection("fans");
    if (status === 'offline') {
        ref.where("uid", "==", uid).limit(1).get()
            .then((querySnapshot) => {
                const docSnapshot: QueryDocumentSnapshot = querySnapshot.docs[0];
                if (docSnapshot === null) {
                    // return null;
                    throw Error("Fan not found");
                }
                const docId = docSnapshot.id;
                return ref.doc(docId).set({ online: false, lastSeen: moment().utc().valueOf() }, { merge: true }).then((wr: WriteResult) => {
                    return {
                        docId: docId, writeResult: wr
                    } as unknown as Pair<String, WriteResult>;
                });
            })
            .then((res: Pair<String, WriteResult>) => {
                console.log(`Updated firestore presence doc ${res.first} at ${res.second.writeTime}`);
                return true;
            })
            .catch((err: any) => {
                console.log(`Failed to update online status. ${err}`)
                return false;
            });
    }
    return false;
}
