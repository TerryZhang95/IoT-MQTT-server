const fs = require('fs')
var mysql = require('mysql');
const axios = require('axios')
var ngeohash = require('ngeohash');
const Influx = require('influx');
const sql_info = require('./auto_sim_id.js')
const config = require('config.json')


const influx = new Influx.InfluxDB({
    host: config.INFLUX_HOST,
    username: config.MYSQL_USR,
    password: config.MYSQL_PWD,
    database: config.MYSQL_DB,
    // schema: [
    //   {
    //     measurement: ,
    //     fields: { geohash: Influx.FieldType.FLOAT },
    //     tags: ['geohash']
    //   }
    // ]
  });

function influx_write(measurement,data,timestamp){
    if(data != 'none'){
        console.log("Write to "+measurement+" geohash is "+data+" at "+String(timestamp)+" using WIFI-Location")
        influx.writePoints([
            {
                measurement: measurement,
                fields: { geohash:data },
                timestamp: timestamp,
            }
          ], {
            database: config.MYSQL_DB,
          })
    }else{
        console.log("data is wrong")
    }

}


var geoJson = {
    "homeMobileCountryCode": 310,
    "homeMobileNetworkCode": 410,
    "radioType": "gsm",
    "carrier": "Telstra",
    "considerIp": "true",
    "cellTowers": [
        // See the Cell Tower Objects section below.
    ],
    "wifiAccessPoints": [
        // See the WiFi Access Point Objects section below.
    ]
}

function geoinfo(geoJson){
    var url = "https://www.googleapis.com/geolocation/v1/geolocate?key="+config.GOOGLE_KEY;    
    return new Promise(function(resolve,reject){
        axios.post(url,geoJson).then(response=>{
            // console.log(response.data)
            resolve(response.data)
        })
    }).catch((err)=>{reject(err)})
}

function get_influx_last(obj){
    return new Promise((resolve,reject)=>{
        influx.query(
            // SELECT * FROM <SERIES> GROUP BY * ORDER BY DESC LIMIT 1
            "SELECT * from "+obj+" ORDER BY DESC LIMIT 1",function(err,res){
                if(err){
                    console.log(err)
                    reject(JSON.stringify({Error: err}))
                }
            }
        ).then(res=>{
            // console.log(res)
            resolve(res[0])
        }).catch((err)=>{reject(err)})
    }).catch(err=>{
        console.log(err)
        reject(err)
    })
}

/**
 * Main procedure
 */
function wifilocation(fridge_id,device_json){
    // sql_info.get_fridgeId(device_json.machine_id).then(fridge_id_res=>{
        // console.log(fridge_id_res[0].DeviceName)
        // let fridge_id = fridge_id_res[0].DeviceName
        /**
         * Get influx info
         */
        get_influx_last(fridge_id).then((influx_last_record,err)=>{
            if(err){
                console.log(err)
            }
            // console.log(influx_last_record.geohash)
            if(!influx_last_record.geohash || (influx_last_record.geohash=='None')){
                // console.log("Add or modify GPS info using WiFi")
                
                /**
                 * Call Geolocation service
                 */
                geoJson["wifiAccessPoints"] = device_json.wifi_list
                // console.log(geoJson)
                geoinfo(geoJson).then((geo_data,err)=>{
                    if(err){
                        console.log(err)
                    }
                    // console.log(geo_data)
                    let lat = geo_data.location.lat
                    let lon = geo_data.location.lng
                    let geohash = ngeohash.encode(lat,lon)
                    let timestamp = influx_last_record.time.getNanoTime()

                    /**
                     * Write into Influx
                     */
                    influx_write(fridge_id,geohash,timestamp)
                })
            }
        }).catch(err=>{
            console.log(err)
        }) 
    // })
}

module.exports = {
    wifilocation: wifilocation
};
