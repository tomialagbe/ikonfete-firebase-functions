import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as handlebars from 'handlebars';
import * as moment from 'moment';
import * as nodemailer from 'nodemailer';
import * as templates from './templates';
import { DocumentReference, CollectionReference, QueryDocumentSnapshot, FieldValue, Firestore } from '@google-cloud/firestore';
import * as fanRepo from '../repository/fan';

const activationTemplate = handlebars.compile(templates.activationCodeEmailTemplate);

export const sendArtistActivationCode = functions.firestore.document("artists/{userId}")
    .onCreate(async (snapshot, context) => {
        const newUser = snapshot.data();
        if (newUser) {
            const email = newUser.email;
            const name = newUser.name;
            const uid = newUser.uid;
            const isFromFacebook = (newUser.facebookId !== null || newUser.facebookId.length > 0) && (newUser.username === null || newUser.username.length === 0);

            if (!isFromFacebook) {
                await _sendActivationCode(uid, name, email, true);
            } else {
                // activate the user
                const auth = admin.auth();
                await auth.updateUser(uid, { emailVerified: true });
            }
        }
        return snapshot;
    });

export const sendFanActivationCode = functions.firestore.document("fans/{userId}")
    .onCreate(async (snapshot, context) => {
        const newUser = snapshot.data();
        if (newUser) {
            const email = newUser.email;
            const name = newUser.name;
            const uid = newUser.uid;
            const isFromFacebook = (newUser.facebookId !== null || newUser.facebookId.length > 0) && (newUser.username === null || newUser.username.length === 0);
            if (!isFromFacebook) {
                await _sendActivationCode(uid, name, email, false);
            } else {
                // activate the user
                const auth = admin.auth();
                await auth.updateUser(uid, { emailVerified: true });
            }
        }
        return snapshot;
    });

/// Deletes the firebase account for the given uid
export const deleteFirebaseUser = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    const firebaseAuth = admin.auth();
    try {
        await firebaseAuth.deleteUser(uid);
        return { success: true };
    } catch (err) {
        console.log(`Failed to delete firebase user. ${err}`);
        return { success: false, error: `Failed to delete firebase user ${uid}. ${err}` };
    }
});

/// FOR TESTING PURPOSES ONLY
export const fixTeamMemberCounts = functions.https.onCall(async (data, context) => {
    const firestore = admin.firestore();
    const querySnapshot = await firestore.collection("artists").get();
    querySnapshot.forEach(async (snap) => {
        console.log("Getting count for " + snap.id);
        const count = await countFansByTeamId(snap.id, firestore);
        console.log("Count for id " + snap.id + " is " + count);
        firestore.collection("artists").doc(snap.id).update({ "teamMemberCount": count });
    });

    console.log("Batch update commited");
    return;
});

/// FOR TESTING PURPOSES ONLY
async function countFansByTeamId(teamId: string, firestore: Firestore): Promise<number> {
    const qs = await firestore.collection("fans").where("currentTeamId", "==", teamId).get();
    return qs.size;
}

export const deleteFan = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    const firebaseAuth = admin.auth();
    const firestore = admin.firestore();

    try {
        const fan: fanRepo.Fan | null = await fanRepo.findFanByUid(uid, firestore);
        if (fan === null) {
            throw Error('Fan not found');
        }

        const artistId = fan.currentTeamId;
        const fanRef = firestore.collection("fans").doc(fan.id);
        const artistRef = firestore.collection("artists").doc(artistId);

        const batch = firestore.batch();
        batch.delete(fanRef);
        batch.update(artistRef, {
            "teamMemberCount": FieldValue.increment(-1),
        });
        await batch.commit();
        await firebaseAuth.deleteUser(uid);
        return { success: true };
    } catch (err) {
        console.log(`Failed to delete fan. ${err}`);
        return { success: false, error: `Failed to delete fan ${uid}. ${err}` };
    }
});

// a test function
export const createActivation = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    await _sendActivationCode(uid, "Tomi", "tomialagbe@yahoo.com", false);
    return true;
});

export const resendActivationCode = functions.https.onCall(async (req, context) => {
    try {
        const uid = req.uid;
        const isArtist = req.isArtist;
        // find the activation for this uid        
        const firestore = admin.firestore();
        let querySnapshot = await firestore.collection("activations").where("uid", "==", uid).limit(1).get();
        if (!querySnapshot.empty) {
            const oldActivation = querySnapshot.docs[0];
            // const docData: FirebaseFirestore.DocumentData = oldActivation.data();
            await oldActivation.ref.delete();
        }

        // const isArtist = docData["isArtist"];
        // uid = docData["uid"];
        const collectionName = isArtist ? "artists" : "fans";
        querySnapshot = await firestore.collection(collectionName).where("uid", "==", uid).limit(1).get();
        const user: FirebaseFirestore.DocumentData | null = querySnapshot.docs.length > 0 ? querySnapshot.docs[0].data() : null;
        if (user === null) {
            return { success: false, error: isArtist ? "Artist " : "Fan " + "not found" };
        }

        await _sendActivationCode(uid, user.name, user.email, isArtist);
        console.log(`Resent activation to ${user.email}\n`)
        return { success: true, error: "" };
    } catch (err) {
        console.log(`Failed to resend activation: ${err}`);
        return { success: false, error: "Failed to resend activation: " + err };
    }
});

/// Activates a firebase auth user
export const activateUser = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    const auth = admin.auth();
    const updateRequest: admin.auth.UpdateRequest = {
        emailVerified: true
    };

    try {
        const userRecord: admin.auth.UserRecord = await auth.updateUser(uid, updateRequest);
        return { success: true, uid: userRecord.uid };
    } catch (error) {
        const errMessage = `Failed to update firebase user: ${error}`;
        console.log();
        return { success: false, error: errMessage };
    }
});

export const verifyArtist = functions.https.onCall(async (data, context) => {
    try {
        const uid = data.uid;
        // const auth = admin.auth();
        const firestore = admin.firestore();
        const artistCollection: CollectionReference = firestore.collection("artists");
        let querySnapshot = await artistCollection.where("uid", "==", uid).limit(1).get()
        if (querySnapshot.docs.length === 0) {
            return { success: false, error: "Artist not found" };
        }

        const doc: QueryDocumentSnapshot = querySnapshot.docs[0];
        const artist = doc.data();
        artist["isVerified"] = true;
        artist["isPendingVerification"] = false;
        artist["dateVerified"] = moment().utc().valueOf();
        artist["dateUpdated"] = moment().utc().valueOf();
        const result = await doc.ref.update(artist);
        console.log(`Successfully updated user ${uid} at ${result.writeTime.toMillis()}.`);

        // delete pending verification
        const pvCollection: CollectionReference = firestore.collection("pending_verifications");
        querySnapshot = await pvCollection.where("uid", "==", uid).get();
        querySnapshot.forEach(async (snap) => {
            await snap.ref.delete();
        });

        // schedule social feed tasks for artist
        const newJob = {
            worker: "loadTwitterFeed",
            status: "scheduled",
            performAt: moment().utc().add("5 minutes").valueOf(),
            param: artist["twitterId"],
        };
        await admin.firestore().collection("tasks").add(newJob);

        return { success: true };
    } catch (error) {
        console.log(`Failed to verify user. ${error}`);
        return { success: false, error: error };
    }
});

async function _sendActivationCode(uid: string, name: string, email: string, isArtist: boolean): Promise<boolean> {
    const code = randomString(5, true);

    // create activation entry
    const activation = {
        "uid": uid,
        "code": code,
        "isArtist": isArtist,
        "expires": moment().add(1, 'h').utc().valueOf()
    };

    const firestore = admin.firestore();
    let doc: DocumentReference;
    try {
        doc = await firestore.collection("activations").add(activation);
        console.log(`Created activation: ${doc.id}\n`);
    } catch (err) {
        console.log(`Error sending mail: ${err}\n`);
        return false;
    }

    return sendMail(email, "Your Ikonfete Activation Code", activationTemplate({
        "name": name, "code": code,
    }));
}

async function sendMail(recipient: string, subject: string, html: string): Promise<boolean> {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'tommytee30@gmail.com',
            pass: 'two4one3632'
        },
    });

    const mailOptions: nodemailer.SendMailOptions = {
        from: 'tommytee30@gmail.com',
        to: recipient,
        subject: subject,
        html: html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipient}\n`);
    } catch (error) {
        console.log(`Error sending mail: ${error}\n`);
        return false;
    }
    return true;
}

function randomString(length: number, singleCase: boolean = true) {
    const chars = singleCase ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}