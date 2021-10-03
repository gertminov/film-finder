import {firestore} from "firebase-admin";
import {Store} from "./store";

type StoreConverterType = firestore.FirestoreDataConverter<Store>

export const storeConverter: StoreConverterType = {
    toFirestore(store: Store): FirebaseFirestore.DocumentData {
        return {storeNo: store.storeNo, storeUrl: store.storeUrl, adress: store.adress, parentZip: store.parentZip, stocks: store.stocks.toObject()}
    },
    fromFirestore(snapshot: FirebaseFirestore.QueryDocumentSnapshot): Store {
        const data = snapshot.data();
        return new Store(data.storeNo, data.storeUrl, data.parentZip, data.adress, data.stocks)
    }
}