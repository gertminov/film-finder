import {Store} from "./store";
import {firestore} from "firebase-admin";
import {storeConverter} from "./firestoreConverter";
import {averageInStock, AvStatus, FName} from "./filmTypes";
import {log} from "firebase-functions/lib/logger";
// import * as faker from "faker"
import Timestamp = firestore.Timestamp;
import * as functions from "firebase-functions";

const admin = require('firebase-admin')

admin.initializeApp();


let db = admin.firestore();
const userDB = db.collection('users')
const zipDB = db.collection('zipCodes');

export async function writeNewZip(zip: string, stores: Store[]) {
    let col = zipDB.doc(zip).collection('dms');
    for (const store of stores) {
        store.parentZip = zip
        await col.doc(store.storeNo).withConverter(storeConverter).set(store)
    }
}

export async function updateFilmStocks(zip: string, stores: string[], changed: { name: string, state: boolean }) {
    let col = zipDB.doc(zip).collection('dms');
    const path = `stocks.${changed.name}.want`;
    for (const store of stores) {
        await col.doc(store).update({[path]: changed.state})
    }
}

export async function checkForZip(zip: string) {
    let col = await zipDB.doc(zip).get()
    console.log("exists: " + col.exists)
    return col.exists
}


export async function getStores() {
    const snapshot = await db.collectionGroup('dms').withConverter(storeConverter).get()
    return storeListToMap(snapshot)
}

export async function getStoresAtZip(zip: string) {
    const snapshot = await zipDB.doc(zip).collection('dms').withConverter(storeConverter).get();
    snapshot.forEach((store: any) => log(store.data().stocks.toObject()))
    return storeListToMap(snapshot)
}


export async function subUsrToZip(id: string, zip: string) {
    await db.collection('users').doc(id).set({
        zips: admin.firestore.FieldValue.arrayUnion(zip),
        [FName.AFGA]: false,
        [FName.GOLD]: false,
        [FName.ULTRA]: false,
        [FName.COLOR]: false,
    }, {merge: true})
}

export async function updateUsrFilmSel(id: string, changed: { name: string, state: boolean }) {
    let data: any = {}
    data[changed.name] = changed.state
    await userDB.doc(id).update(data)
}

export async function unsubUsrFromZip(id: string, zip: string) {
    await userDB.doc(id).update({
        zips: admin.firestore.FieldValue.arrayRemove(zip)
    })
    await db.collection('users').doc(id).set({
        oldzips: admin.firestore.FieldValue.arrayUnion(zip)
    }, {merge: true})
}

export async function getZipsForUsr(id: string): Promise<string[]> {
    const snapshot = await userDB.doc(id).get();
    if (!snapshot.exists) {
        return ["keine PLZs aboniert"]
    }
    return snapshot.data().zips;
}


export async function getUsersWithZip(zip: string) {
    // const snapshot = await db.collection('zipCodes').doc(zip).collection('users').get();
    const snapshot = await db.collection('users').where('zips', 'array-contains', zip).get();
    const users: any[] = [];
    snapshot.forEach((doc: any) => {
        const data = doc.data()
        data.id = doc.id
        users.push(data)
    })
    return users
}

export async function getUser(id: string) {
    const snapshot = await userDB.doc(id).get();
    const data = snapshot.data()
    data.id = snapshot.id
    return data
}


async function createInStockTimeStamp(store: Store) {
    const timestamp = firestore.Timestamp.now();
    const timeStampEntries = zipDB.doc(store.parentZip).collection('dms').doc(store.storeNo).collection('stockChanges')
    if (await stockHasChanged(store, timeStampEntries)) {
        await timeStampEntries.doc(formatDate(timestamp.toDate())).set({
            date: timestamp,
            [FName.GOLD + "Amt"]: store.stocks.gold.amt,
            [FName.ULTRA + "Amt"]: store.stocks.ultra.amt,
            [FName.COLOR + "Amt"]: store.stocks.color.amt,
            [FName.AFGA + "Amt"]: store.stocks.afga.amt
        });
    } else {
        console.log("alles gleich")
    }

}

async function stockHasChanged(store: Store, path: any) {
    console.log("in stockHasChanged")
    let querySnapshot = await path.orderBy("date", "desc").limit(1).get();
    let lastTimeStampEntry

    querySnapshot.forEach((entry: any) => {
        functions.logger.log("data")
        functions.logger.log(entry.data());
        lastTimeStampEntry = entry.data()
        console.log("last Time Stamp Entry")
    })
    // @ts-ignore
    functions.logger.log("is Afga the Same "+ (lastTimeStampEntry[FName.AFGA + "Amt"] == store.stocks.afga.amt))
    // @ts-ignore
    return !(lastTimeStampEntry[FName.AFGA + "Amt"] == store.stocks.afga.amt
        // @ts-ignore
        && lastTimeStampEntry[FName.ULTRA + "Amt"] == store.stocks.ultra.amt
        // @ts-ignore
        && lastTimeStampEntry[FName.COLOR + "Amt"] == store.stocks.color.amt
        // @ts-ignore
        && lastTimeStampEntry[FName.GOLD + "Amt"] == store.stocks.gold.amt);
}

function storeListToMap(snapshot: any) {
    const stores: Map<string, Store> = new Map<string, Store>()
    //@ts-ignore
    snapshot.forEach(doc => {
        stores.set(doc.data().storeNo, doc.data())
    })
    return stores
}

function formatDate(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
}

export class fireStoreDM {

    static async addInStock(store: Store) {
        const timestamp = firestore.Timestamp.now();
        console.log(timestamp.toDate())
        await createInStockTimeStamp(store)

        for (const stock of store.stocks.asArray()) {
            //TODO wenns film nicht gab und dann wieder gab was dann? ist glaub ich geklärt
            if (stock.arrived()) {
                try {
                    await zipDB.doc(store.parentZip).collection('dms')
                        .doc(store.storeNo).collection('stats')
                        .doc("firstHad" + stock.name).create({
                            date: timestamp,
                            amt: stock.amt
                        })
                } catch (e) {
                    console.log("firstHad gabs schon")
                }
                await zipDB.doc(store.parentZip).collection('dms')
                    .doc(store.storeNo).collection('stats')
                    .doc("lastHad" + stock.name).delete()
            }
        }
        await zipDB.doc(store.parentZip).collection('dms').doc(store.storeNo).update({
            stocks: store.stocks.toObject()
        })
    }

    static async remInStock(store: Store) {
        let dif: averageInStock = {
            [FName.GOLD]: -1,
            [FName.COLOR]: -1,
            [FName.ULTRA]: -1,
            [FName.AFGA]: -1
        }
        const timestamp = firestore.Timestamp.now();
        await createInStockTimeStamp(store)
        const statsRef = zipDB.doc(store.parentZip).collection('dms')
            .doc(store.storeNo).collection('stats')

        for (const filmItem of store.stocks.asArray()) {
            if (filmItem.wentOut()) {
                await statsRef.doc("lastHad" + filmItem.name).set({
                    date: timestamp,
                    amt: filmItem.amt
                })

                const firstHadSnap = await statsRef.doc("firstHad" + filmItem.name).get();
                const date: Timestamp = firstHadSnap.data().date;
                await statsRef.doc("firstHad" + filmItem.name).delete()
                // const date:Date = faker.date.recent(12)
                const difHours: number = Math.floor((Date.now() - date.toMillis()) / 3600000)

                const avgInStock = filmItem.avgInStock;
                if (avgInStock > 0) {
                    filmItem.avgInStock = (avgInStock + difHours) / 2;
                } else {
                    filmItem.avgInStock = difHours;
                }

                const meaningfullTime = hoursToMeaningfullTime(difHours)
                if (meaningfullTime.hours) {
                    console.log("difference in Hours: " + meaningfullTime.hours);
                } else {
                    console.log("difference in Days: " + meaningfullTime.days);
                }
            }
        }
        store.stocks.asArray().forEach(stock => stock.avStatus = AvStatus.OUT)
        await zipDB.doc(store.parentZip).collection('dms').doc(store.storeNo).update({
            stocks: store.stocks.toObject(),
        })
        return dif
    }
}

function hoursToMeaningfullTime(hours: number) {
    if (hours < 24) {
        return {
            hours: Math.floor(hours)
        };
    } else {
        return {
            days: Math.floor(hours / 24)
        }
    }
}
