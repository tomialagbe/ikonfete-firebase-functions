import * as admin from 'firebase-admin';

interface Artist {
    id: string
    uid: string
    teamMemberCount: number
    facebookId: string
    twitterId: string
    [index: string]: any
}

const collectionName = "artists";
export const findArtistById = async function (id: string, firestore: admin.firestore.Firestore): Promise<Artist | null> {
    const dSnapshot = await firestore.collection(collectionName).doc(id).get();
    if (!dSnapshot.exists) return null;

    const data = dSnapshot.data();
    if (data === undefined) return null;

    const artist = {
        id: dSnapshot.id,
        uid: data["uid"],
        teamMemberCount: data["teamMemberCount"],
        facebookId: data["facebookId"],
        twitterId: data["twitterId"],
    }
    return artist;
};