import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';
import * as twitter from './twitter';

interface Workers {
    [key: string]: (taskId: string, param: any) => Promise<any>
}

const workers: Workers = {
    loadTwitterFeed: twitter.loadTwitterFeed,
    loadFacebookFeed: loadFacebookFeed,
}

export const feedTaskRunner = functions.runWith({ memory: '512MB' }).pubsub.schedule("*/10 * * * *").onRun(async (ctx: functions.EventContext) => {
    console.log("Running feedTaskRunner");
    const now = moment.utc().valueOf();
    const query = admin.firestore().collection("tasks").where("performAt", "<=", now).where("status", "==", "scheduled");
    const tasks = await query.get();
    const jobs: Promise<any>[] = [];
    console.log(`${jobs.length} Available Jobs`);

    tasks.forEach((snapshot) => {
        const data = snapshot.data();
        const taskId = snapshot.ref.id;
        const worker = data["worker"];
        const param = data["param"];
    
        const job = workers[worker](taskId, param)
            // .then(() => snapshot.ref.update({ status: "complete" }))
            .then(() => snapshot.ref.delete())
            .catch((err) => snapshot.ref.update({ status: "error" }));

        jobs.push(job);
    });
    await Promise.all(jobs);
});

async function loadFacebookFeed(param: any): Promise<any> {
    console.log("Loading facebook feed");
}