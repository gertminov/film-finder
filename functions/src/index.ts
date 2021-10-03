import * as functions from "firebase-functions";
import {updateHandeler} from "./updateHandeler";
import {bot} from "./telegramHandeler";


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const lookForUpdates = functions.region('europe-west1')
    .pubsub.schedule('every 3 hours')
    // .timeZone("Europe/Berlin")
    .onRun((async context => {
    await updateHandeler()
}))


export const filmFinder = functions.region('europe-west1').https.onRequest(async (request, response) => {
    functions.logger.log("Incomming message: ", request.body);
    try {
        await bot.handleUpdate(request.body)
    } finally {
        functions.logger.log('jetzt sind wir am ende angekommmen')
        response.status(200).end()
    }
})



