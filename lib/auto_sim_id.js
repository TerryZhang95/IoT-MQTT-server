const axios = require('axios')
var mysql      = require('mysql');
const config = require('config')

var connection = mysql.createConnection({
    host     : config.MYSQL_HOST,
    user     : config.MYSQL_USR,
    password : config.MYSQL_PWD,
    database : config.MYSQL_DB
})
connection.connect();


async function get_simInfo(imei_number) {
    let url = "https://dashboard.hologram.io/api/1/devices?\
    apikey="+config.HOLO_KEY+"&orgid=18432&imei="+imei_number
    return new Promise(function(resolve,reject){
        axios.get(url).then(sim_info=>{
            // console.log(response)
            resolve(sim_info.data.data[0])
        }).catch(err=>{reject({Error: err})})
    })
}

async function get_fridgeId(machine_id){
    let sql = "SELECT DeviceName FROM devicesmanagement WHERE machine_id='"+machine_id+"'"
    return new Promise((resolve,reject)=>{
        connection.query(sql,(err,read_sql_res)=>{
            if(err) throw err;
            resolve(read_sql_res)
        })
    })
}

async function get_sql_simId(machine_id){
    let sql = "SELECT sim_id FROM devicesmanagement WHERE machine_id='"+machine_id+"'"
    return new Promise((resolve,reject)=>{
        connection.query(sql,(err,read_sql_res)=>{
            if(err) throw err;
            resolve(read_sql_res)
        })
    })
}

async function write_sim_sql(machine_id,sim_info){
    let sim_json = {}
    let sim_id = sim_info.id
    let sql = "UPDATE devicesmanagement SET sim_id="+sim_id+" WHERE machine_id='"+machine_id+"'"
    // console.log(sql)
    return new Promise((resolve,reject)=>{
        connection.query(sql,(err,write_sql_res)=>{
            if(err) throw err
            resolve(write_sql_res.insertId)
        })
    })
}

module.exports={
    get_simInfo: get_simInfo,
    get_sql_simId: get_sql_simId,
    get_fridgeId: get_fridgeId,
    write_sim_sql: write_sim_sql
}