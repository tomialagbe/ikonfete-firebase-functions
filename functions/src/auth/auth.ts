import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as handlebars from 'handlebars';
import * as moment from 'moment';
import * as nodemailer from 'nodemailer';
import * as templates from './templates';
import { DocumentReference, CollectionReference, QueryDocumentSnapshot } from '@google-cloud/firestore';

const activationTemplate = handlebars.compile(templates.activationCodeEmailTemplate);

export const sendArtistActivationCode = functions.firestore.document("artists/{userId}")
    .onCreate(async (snapshot, context) => {
        const newUser = snapshot.data();
        if (newUser) {
            const email = newUser.email;
            const name = newUser.name;
            const uid = newUser.uid;
            await _sendActivationCode(uid, name, email, true);
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
            await _sendActivationCode(uid, name, email, false);
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
        console.log(`Failed to delete user. ${err}`);
        return { success: false, error: `Failed to delete user ${uid}. ${err}` };
    }
});

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