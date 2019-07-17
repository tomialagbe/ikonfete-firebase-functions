import * as admin from 'firebase-admin';

export interface Fan {
    id: string
    uid: string
    currentTeamId: string
    [index: string]: any
}

const collectionName = "fans";
export const findFanByUid = async function (uid: string, firestore: admin.firestore.Firestore): Promise<Fan | null> {
    const qSnapshot = await firestore.collection(collectionName).where("uid", "==", uid).limit(1).get();
    if (qSnapshot.empty) {
        return null;
    }
    const dSnapshot = qSnapshot.docs[0];
    const data = dSnapshot.data();
    const fan = {
        id: dSnapshot.id,
        uid: data["uid"],
        currentTeamId: data["currentTeamId"],
    }
    return fan;
};