import {AvStatus, FilmType, FName} from "./filmTypes";

export class Store {



    private readonly _storeNo: string;
    private readonly _storeUrl: string;
    private readonly _adress: { street: string; zip: string; city: string, lat:number, lon:number };
    private _parentZip: string
    private _stocks: Stocks = new Stocks()


    constructor(
        storeNo: string,
        storeUrl: string,
        parentZip: string,
        adress: { street: string, zip: string, city: string, lat:number, lon:number },
        stocks?: any,
    ) {
        this._storeNo = storeNo
        this._storeUrl = storeUrl
        this._parentZip = parentZip
        this._adress = adress
        if (stocks) {
            console.log("stocks wurden übergeben")
            const ultra = this._stocks.ultra;
            ultra.want = stocks[FName.ULTRA].want
            ultra.amt = stocks[FName.ULTRA].amt
            ultra.avStatus = stocks[FName.ULTRA].avStatus

            const gold = this._stocks.gold;
            gold.want = stocks[FName.GOLD].want
            gold.amt = stocks[FName.GOLD].amt
            gold.avStatus = stocks[FName.GOLD].avStatus

            const color = this._stocks.color;
            color.want = stocks[FName.COLOR].want
            color.amt = stocks[FName.COLOR].amt
            color.avStatus = stocks[FName.COLOR].avStatus

            const afga = this._stocks.afga;
            afga.want = stocks[FName.AFGA].want
            afga.amt = stocks[FName.AFGA].amt
            afga.avStatus = stocks[FName.AFGA].avStatus
        }
    }

    get stocks(): Stocks {
        return this._stocks;
    }

    set stocks(value: Stocks) {
        this._stocks = value;
    }
    set parentZip(value: string) {
        this._parentZip = value;
    }


    has(type:FilmType): boolean {
        let filmItem = this._stocks.get(type);
        return filmItem.avStatus == AvStatus.HAS || filmItem.avStatus == AvStatus.ARRIVED
    }

    arrived(type: FilmType): boolean {
        return this.stocks.get(type).avStatus == AvStatus.ARRIVED
    }


    get storeNo(): string {
        return this._storeNo;
    }

    get storeUrl(): string {
        return this._storeUrl;
    }

    get parentZip(): string {
        return this._parentZip;
    }

    get adress(): { street: string; zip: string; city: string; lat: number; lon: number } {
        return this._adress;
    }


}

export class FilmItem {
    name: string
    fullName: string
    want: boolean
    amt: number
    avStatus: AvStatus
    prodId: string
    avgInStock:number


    constructor(name: string, want: boolean, amt: number, prodId: string, avgInStock:number, avStatus: AvStatus, fullName:string) {
        this.name = name;
        this.want = want;
        this.amt = amt;
        this.prodId = prodId
        this.avgInStock = avgInStock
        this.avStatus = avStatus
        this.fullName = fullName
    }

    inStock():boolean {
        return this.avStatus == AvStatus.ARRIVED||this.avStatus == AvStatus.HAS
    }

    has(): boolean {
        return this.avStatus == AvStatus.HAS
    }

    arrived():boolean {
        return this.avStatus == AvStatus.ARRIVED
    }

    wentOut(): boolean {
        return this.avStatus == AvStatus.WENTOUT
    }

    toObject() {
        return {name: this.name, want: this.want, amt:this.amt, prodId: this.prodId, avgInStock: this.avgInStock, avStatus: this.avStatus}
    }
}

class Stocks {

    private _gold:FilmItem = new FilmItem(FName.GOLD, false, 0, FilmType.kodakGold, -1,AvStatus.OUT,"Kodak Gold 200" )
    private _ultra: FilmItem = new FilmItem(FName.ULTRA, false, 0,  FilmType.kodakUltraMax, -1, AvStatus.OUT, "Kodak UltraMax 400")
    private _color: FilmItem = new FilmItem(FName.COLOR, false, 0, FilmType.kodakColorPlus,  -1, AvStatus.OUT, "Kodak Color Plus 400");
    private _afga: FilmItem = new FilmItem(FName.AFGA, false, 0,  FilmType.afgaBW, -1, AvStatus.OUT, "Afga Black/White 100")
    private _error: FilmItem = new FilmItem("There is a big Problem", false, -100,  "error", -1, AvStatus.OUT, "This should not show up")

    get(input:string): FilmItem {
        switch (input) {
            case FilmType.kodakGold:
                return this._gold
            case FilmType.kodakUltraMax:
                return this._ultra
            case FilmType.kodakColorPlus:
                return this._color
            case FilmType.afgaBW:
                return this._afga
            default:
                return this._error
        }
    }

    get gold(): FilmItem {
        return this._gold;
    }

    get ultra(): FilmItem {
        return this._ultra;
    }

    get color(): FilmItem {
        return this._color;
    }

    get afga(): FilmItem {
        return this._afga;
    }

    asArray() {
        return [this._gold,this._ultra,this._color,this._afga]
    }

    toObject() {
        return{
            [FName.GOLD]: this._gold.toObject(),
            [FName.ULTRA]: this._ultra.toObject(),
            [FName.COLOR]: this._color.toObject(),
            [FName.AFGA]: this._afga.toObject()
        }
    }

}
