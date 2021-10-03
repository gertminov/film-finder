export enum FilmType{
    kodakGold="405075",
    kodakUltraMax = "276758",
    kodakColorPlus = "724104",
    afgaBW = "200177"
}

export enum FName {
    GOLD= "kodakGold",
    ULTRA= "kodakUltraMax",
    COLOR = "kodakColorPlus",
    AFGA = "afgaBW"
}

export type averageInStock ={
    [FName.GOLD]: number
    [FName.COLOR]: number,
    [FName.ULTRA]:number,
    [FName.AFGA]: number
}

export enum AvStatus {
    OUT,
    ARRIVED,
    HAS,
    WENTOUT
}