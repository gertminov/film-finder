import {request} from 'gaxios'
import {Store} from "./store";
import {AvStatus} from "./filmTypes";

// import {FilmType} from "./filmTypes"


export async function getAvailability(stores: Map<string, Store>) {
    const stValues = [...stores.values()]
    // stValues.filter(store => store.stocks.asArray().filter(stock => stock.has).length > 0)
    //     .forEach(store => store.stocks.asArray().forEach(stock => {
    //         stock.wentOut = false
    //     }))

    const wantAfga: string[] = []
    const wantGold: string[] = []
    const wantUltra: string[] = []
    const wantColor: string[] = []
    stValues.forEach(store => {
        const stocks = store.stocks;
        if (stocks.afga.want) {
            if (stocks.afga.inStock()) {
                stocks.afga.avStatus = AvStatus.WENTOUT
            }
            wantAfga.push(store.storeNo)
        }
        if (stocks.gold.want) {
            if (stocks.gold.inStock()) {
                stocks.gold.avStatus = AvStatus.WENTOUT
            }
            wantGold.push(store.storeNo)
        }
        if (stocks.ultra.want) {
            if (stocks.ultra.inStock()) {
                stocks.ultra.avStatus = AvStatus.WENTOUT
            }
            wantUltra.push(store.storeNo)
        }
        if (stocks.color.want) {
            if (stocks.color.inStock()) {
                stocks.color.avStatus = AvStatus.WENTOUT
            }
            wantColor.push(store.storeNo)
        }
    })


    console.log("want afga: " + wantAfga);
    console.log("want gold: " + wantGold);
    console.log("want plus: " + wantColor);
    console.log("want ultra: " + wantUltra);

    const prodNoStoreMap: Map<string, string[]> = new Map<string, string[]>([
        ["405075", wantGold],
        ["200177", wantAfga],
        ["276758", wantUltra],
        ["724104", wantColor]
    ])

    const availStores: Map<string, Store> = new Map<string, Store>()
    for (const [key, value] of prodNoStoreMap) {
        if (value.length > 0) {
            const res = await request({url: `https://products.dm.de/store-availability/de/products/dans/${key}/availability-with-listing?storeNumbers=${value}`});
            writeAvailToStore(stores, availStores, res)
        }
    }
    const notAnymoreStores = stValues.filter(store => store.stocks.asArray().filter(stock => stock.wentOut()).length > 0)//TODO testen ob stock.has immer richtig gesetzt wird
    // console.log("not Available Anymore:")
    // console.dir(notAnymoreStores)
    // console.log("storeNummers: " + availStores)

    return {
        availStores: [...availStores.values()],
        notAnyMoreStores: notAnymoreStores
    }
}


function writeAvailToStore(stores: Map<string, Store>, availStores: Map<string, Store>, res: any) {
    for (const jStore of res.data.storeAvailability) {
        if (jStore.inStock) {
            // console.log("dan: " + res.data.dan)
            // console.log("stockLevel: " + jStore.stockLevel)
            // @ts-ignore
            const theStore = stores.get(jStore.store.storeNumber)

            if (!theStore) return
            const theStock = theStore.stocks.get(res.data.dan);
            theStock.amt = jStore.stockLevel
            switch (theStock.avStatus) {
                case AvStatus.OUT:
                    theStock.avStatus = AvStatus.ARRIVED
                    break
                case AvStatus.WENTOUT:
                    theStock.avStatus = AvStatus.HAS;
                    break
                case AvStatus.ARRIVED:
                    theStock.avStatus = AvStatus.HAS
                    break
            }
            availStores.set(jStore.store.storeNumber,
                theStore
            )
        }
    }
}

export async function getStoresFromCoords(lat: string, long: string) {
    const data = await request({url: `https://store-data-service.services.dmtech.com/stores/nearby/${lat}%2C${long}/1?countryCode=DE`})
    const myStores: Map<string, Store> = new Map<string, Store>()
    // @ts-ignore
    let stores = data.data.stores;
    for (const store of stores) {
        myStores.set(store.storeNumber,
            new Store(store.storeNumber, store.storeUrlPath, "", {
                    street: store.address.street,
                    zip: store.address.zip,
                    city: store.address.city,
                    lat: store.location.lat,
                    lon: store.location.lon
                }
            ))
    }


    return myStores

}
