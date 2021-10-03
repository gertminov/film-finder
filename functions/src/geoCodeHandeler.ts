import {request} from "gaxios"
import * as functions from "firebase-functions"
// import axios from "axios";

// const client = new Client({})

// latitude: "47.65"
// longitude: "8.4"


export function getMockCoords(zip: string):{ success: boolean, data:any } {
    return {
        success:true,
        data:{
            country: "DE",
            countryCode2: "DE",
            countryCode3: "DEU",
            state: "Hessen",
            stateCode2: "HE",
            latitude: "50.5442",
            longitude: "9.7179",
            zipCode: "36093",
            city: "Künzell"
        }
    }
}

export async function getCoords(zip:string):Promise<{ success: boolean, data:any }> {
    const response = await request(
        {
            url:`https://thezipcodes.com/api/v1/search?zipCode=${zip}&countryCode=DE&apiKey=${functions.config().zipcodes.key}`
        });
    // @ts-ignore
    if (response.data.location.length == 0) {
        return {
            success:false,
            data:"diese Location gibts nicht"
        }
    }
    // @ts-ignore

    return {
        success:true,
        // @ts-ignore
        data: response.data.location[0]
    };
}
