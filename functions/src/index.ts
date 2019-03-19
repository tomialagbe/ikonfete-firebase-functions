// import * as functions from 'firebase-functions';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as handlebars from 'handlebars';
import * as moment from 'moment';
import * as nodemailer from 'nodemailer';
import * as templates from './templates';
import { DocumentReference } from '@google-cloud/firestore';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

admin.initializeApp();

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
        return {success: true};
    } catch (err) {
        console.log(`Failed to delete user. ${err}`);
        return {success: false, error: `Failed to delete user ${uid}. ${err}`};
    }
});

export const createActivation = functions.https.onCall(async (data, context) => {
    const uid = data.uid;
    await _sendActivationCode(uid, "Tomi", "tomialagbe@yahoo.com", false);
    return true;
});

export const resendActivationCode = functions.https.onCall(async (req, context) => {
    try {
        let uid = req.uid;
        // find the activation for this uid        
        const firestore = admin.firestore();
        let querySnapshot = await firestore.collection("activations").where("uid", "==", uid).limit(1).get();
        const oldActivation = querySnapshot.docs[0];        
        const docData: FirebaseFirestore.DocumentData = oldActivation.data();        
        await oldActivation.ref.delete();
        const isArtist = docData["isArtist"];
        uid = docData["uid"];
        const collectionName = isArtist ? "artists" : "fans"; 
        querySnapshot = await firestore.collection(collectionName).where("uid", "==", uid).limit(1).get();
        const user: FirebaseFirestore.DocumentData | null = querySnapshot.docs.length > 0 ? querySnapshot.docs[0].data() : null;
        if (user === null) {
            return {success: false, error: isArtist ? "Artist " : "Fan " + "not found"};
        }

        await _sendActivationCode(uid, user.name, user.email, isArtist);
        console.log(`Resent activation to ${user.email}\n`)
        return {success: true, error: ""};
    } catch (err) {
        console.log(`Failed to resend activation: ${err}`);
        return {success: false, error: "Failed to resend activation: " + err};
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
        return {success: true, uid: userRecord.uid};
    } catch (error) {
        const errMessage = `Failed to update firebase user: ${error}`;
        console.log();
        return {success: false, error: errMessage};
    }
});

async function _sendActivationCode(uid: string, name: string, email: string, isArtist: boolean): Promise<boolean> {
    const code = randomString(5);

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
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'tommytee30@gmail.com',
            pass: 'two4one3632'
        },                
    });
        
    const mailOptions : nodemailer.SendMailOptions = {
        from: 'tommytee30@gmail.com',                
        to: email,                
        subject: 'Your Ikonfete Activation Code',
        html: activationTemplate({
            "name": name, "code": code,
        }),
    };
    
    try {        
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}\n`);
    } catch (error) {
        console.log(`Error sending mail: ${error}\n`);
        return false;
    }    

    return true;          
}
    
function randomString(length: number) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}