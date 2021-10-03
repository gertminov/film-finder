import {fireStoreDM, getStores, getStoresAtZip, getUser, getUsersWithZip} from "./fireStoreHandeler";
import {getAvailability} from "./dmHandeler";
import {Store} from "./store";
import {notify, notifyEmpty, notifyOut} from "./telegramHandeler";
// import {FilmType, FName} from "./filmTypes";

export async function updateHandeler() {
    const storeMap = await getStores();

    if (storeMap.size == 0) {
        return
    }

    console.log(storeMap)
    const stores = await getAvailability(storeMap);
    console.log("nach dm Check")
    // console.log(stores.availStores[0].stocks.afga.amt)
    // const stores = noToStoreConverter(stores, availStorNumbers);

    for (const availStore of stores.availStores) {
        const instockPromise = fireStoreDM.addInStock(availStore);
        const users = await getUsersWithZip(availStore.parentZip);
        console.log("users mit zip: " + availStore.parentZip)
        for (const user of users) {
           await notifyUsr(availStore, user);
        }
        await Promise.all([instockPromise])
    }
    for (const store of stores.notAnyMoreStores) {
        await fireStoreDM.remInStock(store)
    }

    return stores
}

export async function updateSingleUser(zip: string, id:string) {
    const storeMap = await getStoresAtZip(zip);

    if (storeMap.size == 0) {
        return
    }
    const stores = await getAvailability(storeMap);
    const user = await getUser(id);
    let hasNotified:boolean = false
    for (const availStore of stores.availStores) {
        hasNotified = await notifyUsr(availStore, user);
    }
    if (!hasNotified) {
       await notifyEmpty(user.id, "Leider gibt es momentan in keinem der Märkte Film.\n Ich schicke dir eine Nachricht sobald es wieder welchen gibt")
    }
}


async function notifyUsr(store: Store, user: any): Promise<boolean> {
    let hasNotified = false;
    for (const stock of store.stocks.asArray()) {
        if (stock.arrived()) {
            hasNotified =true
            await notify(user.id, store, stock.fullName, stock.amt)
        }
        if (stock.wentOut()) {
            await notifyOut(user.id, store, stock.fullName)
        }
    }
    return hasNotified
}

