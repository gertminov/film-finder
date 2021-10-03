import {Telegraf, Context, Markup} from "telegraf";
import {Store} from "./store";
import {
    checkForZip,
    getZipsForUsr,
    subUsrToZip,
    unsubUsrFromZip, updateFilmStocks, updateUsrFilmSel,
    writeNewZip
} from "./fireStoreHandeler";
import {getCoords} from "./geoCodeHandeler";
import * as functions from  "firebase-functions"
// import {getCoords} from "./geoCodeHandeler";
import {getStoresFromCoords} from "./dmHandeler";
import {updateHandeler, updateSingleUser} from "./updateHandeler";
import {FName} from "./filmTypes";

export const bot = new Telegraf(functions.config().telegram.key)

let filmSelectButtons = [
    [Markup.button.callback("Kodak Gold 200", "selStockKodakGold")],
    [Markup.button.callback("Kodak UltraMax 400", "selStockKodakUltraMax")],
    [Markup.button.callback("Kodak Color Plus 400", "selStockKodakColorPlus")],
    [Markup.button.callback("Afga Black/White 100", "selStockAfgaBW&errZip")],
    [Markup.button.callback("OK", "filmSelectOK")]
];

bot.command('test', async (ctx) => {
    console.log("Vor handeler")
    await updateHandeler()
})

bot.catch((err, ctx) => {
    console.error('[Bot] Errlr', err)
})

bot.command("start", async (ctx: Context) => {
    ctx.reply("Ja Moin,\nnutze /subscribe gefolgt von einer Postleizahl \n(/subscribe 123456)\n" +
        " um benachrightigt zu werden, wenn ein DM in deiner Nähe Film hat.\n\n" +
        "Nutze /remove um dich von einer Postleizahl wieder abzumelden")
});

bot.command('subscribe', async (ctx: Context) => {
    const zip = cleanMessage(ctx, ["/subscribe", " "]);
    // @ts-ignore
    const {success, stores} = await subToZip(ctx.chat.id.toString(), zip);
    if (!success) {
        await ctx.reply("Postleizahl konnte nicht gefunden werden")
        return
    }
    writeStoresToButton(zip, [...stores.keys()])
    await ctx.reply("Für welche Filme möchtest du benachrichtigt werden?",
        Markup.inlineKeyboard(filmSelectButtons))
    // await ctx.reply("drücke OK wenn du fertig bist")
    // Markup.inlineKeyboard([Markup.button.callback("OK", "filmSelectOK")]))
    // await ctx.reply("Wunderbar, du wirst benachrichtigt wenn ein DM in deiner Nähe Filme auf Lager hat.");

})

function writeStoresToButton(zip: string, stores: string[]) {

    filmSelectButtons = [
        [Markup.button.callback("Kodak Gold 200", `selStockKodakGold&${zip}&${stores}`)],
        [Markup.button.callback("Kodak UltraMax 400", `selStockKodakUltraMax&${zip}&${stores}`)],
        [Markup.button.callback("Kodak Color Plus 400", `selStockKodakColorPlus&${zip}&${stores}`)],
        [Markup.button.callback("Afga Black/White 100", `selStockAfgaBW&${zip}&${stores}`)],
        [Markup.button.callback("OK", "filmSelectOK")]
    ];
    console.log("Stores written zu Buttons")
}

bot.command('remove', async (ctx: Context) => {
    // @ts-ignore
    const zips = await getZipsForUsr(ctx.chat.id.toString());
    const buttons = zips.map(zip => [Markup.button.callback(zip, "delete" + zip)]);
    ctx.reply("Dies sind die PLZs die du aboniert hast. tippe eine an um sie zu löschen", Markup.inlineKeyboard(buttons))
})

bot.on('callback_query', async (ctx) => {
    // @ts-ignore
    const text: string = ctx.callbackQuery.data;
    if (text.includes("delete")) {
        const delConfirmation = await remove(ctx, text);
        ctx.answerCbQuery()
        ctx.reply(delConfirmation)
    }
    if (text.includes("Stock")) {

        const strings = text.split("&");
        const zip = strings[1];
        const stores = strings[2];
        console.log(strings)
        // @ts-ignore
        filmSelectButtons = ctx.callbackQuery.message.reply_markup.inline_keyboard

        let changed: { name: string, state: boolean } = {name: "wrong", state: false}


        if (strings[0].includes("sel")) {
            switch (strings[0]) {
                case "selStockKodakGold":
                    filmSelectButtons[0] = [Markup.button.callback("Kodak Gold 200 ✔", `deSelStockKodakGold&${zip}&${stores}`)]
                    changed = {name: FName.GOLD, state: true}
                    break
                case "selStockKodakUltraMax":
                    filmSelectButtons[1] = [Markup.button.callback("Kodak UltraMax 400 ✔", `deSelStockKodakUltraMax&${zip}&${stores}`)]
                    changed = {name: FName.ULTRA, state: true}
                    break
                case "selStockKodakColorPlus":
                    filmSelectButtons[2] = [Markup.button.callback("Kodak Color Plus 400 ✔", `deSelStockKodakColorPlus&${zip}&${stores}`)]
                    changed = {name: FName.COLOR, state: true}
                    break
                case "selStockAfgaBW":
                    filmSelectButtons[3] = [Markup.button.callback("Afga Black/White 100 ✔", `deSelStockAfgaBW&${zip}&${stores}`)]
                    changed = {name: FName.AFGA, state: true}
                    break
            }

        }
        if (strings[0].includes("deSel")) {
            switch (strings[0]) {
                case "deSelStockKodakGold":
                    filmSelectButtons[0] = [Markup.button.callback("Kodak Gold 200", `selStockKodakGold&${zip}&${stores}`)]
                    changed = {name: FName.GOLD, state: false}
                    break
                case "deSelStockKodakUltraMax":
                    filmSelectButtons[1] = [Markup.button.callback("Kodak UltraMax 400", `selStockKodakUltraMax&${zip}&${stores}`)]
                    changed = {name: FName.ULTRA, state: false}
                    break
                case "deSelStockKodakColorPlus":
                    filmSelectButtons[2] = [Markup.button.callback("Kodak Color Plus 400", `selStockKodakColorPlus&${zip}&${stores}`)]
                    changed = {name: FName.COLOR, state: false}
                    break
                case "deSelStockAfgaBW":
                    filmSelectButtons[3] = [Markup.button.callback("Afga Black/White 100", `selStockAfgaBW&${zip}&${stores}`)]
                    changed = {name: FName.AFGA, state: false}
                    break
            }
        }
        // @ts-ignore
        const ursUpdate = updateUsrFilmSel(ctx.chat.id.toString(), changed);
        const storeUpdate = updateFilmStocks(zip, stores.split(","), changed);
        const cbUpdate = ctx.answerCbQuery();
        await ctx.editMessageReplyMarkup({
            inline_keyboard: filmSelectButtons
        });

        await Promise.all([ursUpdate, storeUpdate, cbUpdate])
    }
    if (text == "filmSelectOK") {
        console.log('\x1b[36m%s\x1b[0m', "callback_data")
        ctx.answerCbQuery()
        // @ts-ignore
        const zip = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].callback_data.split("&")[1];
        console.log(zip)
        // @ts-ignore
        await updateSingleUser(zip, ctx.chat.id.toString())

    }
    if (text.startsWith("{\"lon")) {
        console.log("Location wird Erkannt")
        console.log(text)
        const location = JSON.parse(text);
        ctx.answerCbQuery()
        // @ts-ignore
        await ctx.telegram.sendLocation(ctx.chat.id, location.lat, location.lon)
        // await ctx.reply(location.lat, location.lon)
    }

})

async function remove(ctx: Context, text: string) {
    const zip = text.replace("delete", "")

    // @ts-ignore
    await unsubUsrFromZip(ctx.chat.id.toString(), zip)
    return "PLZ wurde gelöscht"
}

export async function notify(user: string, store:Store, stock: string, amt: number) {
    const message = `im DM in der ${store.adress.street} gibt es:\n${amt} Rollen ${stock}`;
    const location ={
        lon:store.adress.lon,
        lat:store.adress.lat
    }
    await bot.telegram.sendMessage(user, message,Markup.inlineKeyboard([[Markup.button.callback("Get Directions", JSON.stringify(location))]]))
}

export async function notifyOut(user: string, store: Store, stock: string) {
    const message = `im DM in der ${store.adress.street} gibt es kein ${stock} mehr`;
    await bot.telegram.sendMessage(user,message)
}

export async function notifyEmpty(userID: string, message: string) {
    await bot.telegram.sendMessage(userID, message)
}

async function subToZip(id: string, zip: string): Promise<{ success: boolean, stores: Map<string, Store> }> {
    const exists = await checkForZip(zip);
    let storesFromCoords: Map<string, Store> = new Map<string, Store>()
    if (!exists) {
        const {success, data} = await getCoords(zip);
        // const {success, data} = getMockCoords(zip)
        if (!success) {
            return {success: false, stores: new Map<string, Store>()}
        }
        storesFromCoords = await getStoresFromCoords(data.latitude, data.longitude);
        await writeNewZip(zip, [...storesFromCoords.values()])
    }
    await subUsrToZip(id, zip)
    return {success: true, stores: storesFromCoords}
}

function cleanMessage(ctx: any, toBeRemovedWords: string[]) {
    let message: string = ctx.message.text
    for (const word of toBeRemovedWords) {
        message = message.replace(word, '')
    }
    return message
}