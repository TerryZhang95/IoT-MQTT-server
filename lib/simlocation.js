const Influx = require('influx');
const axios = require('axios')
var ngeohash = require('ngeohash');
var mysql      = require('mysql');

// var device = 'Sanofi1'
var device;

var connection = mysql.createConnection({
    host     : config.MYSQL_HOST,
    user     : config.MYSQL_USR,
    password : config.MYSQL_PWD,
    database : config.MYSQL_DB
})

async function get_simInfo(){
    return new Promise((resolve,reject)=>{
        connection.connect();
        connection.query('SELECT sim_id,DeviceName FROM devicesmanagement', function (error, results) {
            let jsonObj={};
            if (error) throw error;
            // console.log('The solution is: ', results);
            results.forEach(element => {
                if(element.sim_id){
                    jsonObj[element.DeviceName]=element.sim_id
                }
            });
            // console.log(jsonObj)
            resolve(jsonObj)
        });
        connection.end();
    })
}

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
    console.log("Write to "+measurement+" geohash is "+data+" at "+String(timestamp)+" using Sim-Location")
    influx.writePoints([
        {
            measurement: measurement,
            fields: { geohash:data },
            timestamp: timestamp,
        }
      ], {
        database: 'CCA',
      })
}

async function holo_GPS(sim){
    var url = "https://dashboard.hologram.io/api/1/devices/"+sim+"/?apikey="+config.HOLO_KEY; 
    return new Promise(function(resolve,reject){
        axios.get(url).then(response=>{
            // console.log(response)
            resolve(response)
        })
    })
}

function geo_calculation(result,obj,sim){
    return new Promise((resolve, reject)=>{
        if((!result.geohash) || result.geohash=='None'){
            let http_res = holo_GPS(sim)
            http_res.then(res=>{
                // console.log("Data of "+obj+" is "+res.data.data.lastsession)
                // console.log(res.data.data.lastsession.longitude)
                let lat = res.data.data.lastsession.latitude
                let lon = res.data.data.lastsession.longitude
                let geohash = ngeohash.encode(lat,lon)
                let json = {};
                let time = result.time.getNanoTime()
                // console.log("time is "+time+" And type is "+typeof(time))
                let array = [];
                array.push(geohash)
                array.push(obj)
                json[time] = array
                resolve(json)
            }).catch((err)=>{
                reject({Error: err})
            })
        }
    })
}

function get_influx(obj){
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
        })
    })
}

function db_mapping(obj,sim_res){
    return new Promise((resolve,reject)=>{
        let geohash = get_influx(obj)
        geohash.then(geo=>{
            // console.log(geo)
            let record = geo_calculation(geo,obj,sim_res)
            resolve(record)
        }).catch((err)=>{
            reject({Error:err})
        })
    })
}

let sim_info = get_simInfo()
sim_info.then(sim_res=>{
    for(var obj in sim_res){
        let result = db_mapping(obj,sim_res[obj])
        // console.log(result)
        result.then(geo=>{
            // console.log(geo)
            let time = Object.keys(geo)
            // console.log(geo[time])
            let data_res = geo[time]
            influx_write(data_res[1],data_res[0], time[0])
        })
    }
})
