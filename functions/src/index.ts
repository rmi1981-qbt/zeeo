import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleDeliveryWebhook } from "./api/webhook";

admin.initializeApp();

export const api = functions.https.onRequest(handleDeliveryWebhook);

export const helloZeeo = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Zeeo Backend is Alive!");
});
