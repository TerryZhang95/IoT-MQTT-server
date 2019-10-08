const sim_info = require("../lib/auto_sim_id")
const config =  require("../lib/config")
function test_get_simInfo(){
    let imei = config.IMEI

    return new Promise((resolve,reject)=>{
        sim_info.get_simInfo(imei).then(res=>{
            resolve(res)
        })
    })
}

function test_get_sql(res) {
    let machine_id = config.MACHINE
    sim_info.write_sim_sql(machine_id,res).then(res=>{
        console.log(res)
        
    })
}
test_get_simInfo().then(res=>{
    // console.log(res)
    test_get_sql(res)
})