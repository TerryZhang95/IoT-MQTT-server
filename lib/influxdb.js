const Influx = require('influx');

const THERO_LOW = -55.0
const THERO_HIGH = 125.0

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
    // console.log(data)
    let sensing_data = JSON.parse(data)
    // console.log("Write to "+measurement+" geohash is "+data+" at "+String(timestamp)+" using Sim-Location")
    if(parseInt(sensing_data.TPROBE)<THERO_LOW || parseInt(sensing_data.TPROBE)>THERO_HIGH){
        sensing_data.TPROBE = "0"
    }
    influx.writePoints([
        {
            measurement: measurement,
            fields: { 
                 geohash: sensing_data.geohash,
                 BATTERY: sensing_data.BATTERY,
                 FREEMEM: sensing_data.FREEMEM,
                 TPROBE: sensing_data.TPROBE
            },
            timestamp: timestamp,
        }
      ], {
        database: 'CCA',
      })
}

module.exports={
    influx_write: influx_write
}