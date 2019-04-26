import * as functions from 'firebase-functions';
import { Firestore, CollectionReference, QueryDocumentSnapshot, WriteResult } from '@google-cloud/firestore';
import moment = require('moment');
// import { firestore } from 'firebase-admin';

interface Pair<F, S>{
    first: F;
    second: S;
}

export const onUserStatusChanged = functions.database.ref("/status/{userId}")
    .onUpdate((change, ctx) => {
        console.log("Update recieved");
        if (ctx.auth === undefined || change.after === undefined || !change.after.exists()) {
            return false;
        }
        const uid = ctx.auth.uid;
        const status = change.after.val();

        console.log("Handling update");

        const firestore = new Firestore();
        const ref: CollectionReference = firestore.collection("user_presence");
        if (status === 'offline') {
            ref.where("uid", "==", uid).limit(1).get().then((querySnapshot) => {
                const docSnapshot: QueryDocumentSnapshot = querySnapshot.docs[0];
                if (docSnapshot === null) {
                    // return null;
                    throw Error("User presence document not found");
                }

                return docSnapshot.id;
            }).then((docId) => {            
                return ref.doc(docId).set({ online: false, lastSeen: moment().utc().valueOf() }, { merge: true }).then((wr: WriteResult) => {
                    return {
                        docId: docId, writeResult: wr
                    } as unknown as Pair<String, WriteResult>;
                });
            }).then((res: Pair<String, WriteResult>) => {    
                console.log(`Updated firestore presence doc ${res.first} at ${res.second.writeTime}`);
                return true;
            })
            .catch((err: any) => {
                console.log(`Failed to update online status. ${err}`)
                return false;
            });

            // let querySnapshot = await ref.where("uid", "==", uid).limit(1).get();
            // let docSnapshot: QueryDocumentSnapshot = querySnapshot.docs[0];
            // if (docSnapshot == null) {
            //     return false;
            // }

            // let docId = docSnapshot.id;
            // await ref.doc(docId).set({ online: false, lastSeen: moment().utc().valueOf() }, { merge: true });                
        }
        return false;
    });
