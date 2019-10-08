const mosca = require('mosca');
const wifilocation = require('./auto_wifilocation')
const sim_id = require('./auto_sim_id.js')
const influxdb = require('./influxdb.js')
const config = require('./config')
var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: 'mongodb://localhost:27017/test',
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

var settings = {
  port: 1883,
  backend: ascoltatore
};

var server = new mosca.Server(settings);

// Accepts the connection if the username and password are valid
var authenticate = function(client, username, password, callback) {
  var authorized = (username === config.MQTT_USR && password.toString() === config.MQTT_PWD);
  if (authorized) client.user = username;
  callback(null, authorized);
}

// In this case the client authorized as alice can publish to /users/alice taking
// the username from the topic and verifing it is the same of the authorized user
var authorizePublish = function(client, topic, payload, callback) {
  callback(null, client.user == topic.split('/')[1]);
}

// In this case the client authorized as alice can subscribe to /users/alice taking
// the username from the topic and verifing it is the same of the authorized user
var authorizeSubscribe = function(client, topic, callback) {
  callback(null, client.user == topic.split('/')[1]);
}

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
  server.authenticate = authenticate;
  // server.authorizePublish = authorizePublish;
  // server.authorizeSubscribe = authorizeSubscribe;  
}

server.on('clientConnected', function(client) {
  console.log('client connected', client.id);
});

server.on('subscribed',function(topic,client){
  console.log("Subscribed",topic)
})

server.on('published', function(packet, client) {
  if(typeof(client)=="undefined"){
    // console.log("No message received")
    return
  }
  else{
    // console.log('Published', packet.payload.toString());
    let device_json = JSON.parse(packet.payload.toString())
    // console.log(device_json)
    sim_id.get_fridgeId(device_json.machine_id).then(fridge_id_res=>{
      let fridge_id = fridge_id_res[0].DeviceName
      influxdb.influx_write(fridge_id,device_json.ses_data,device_json.timestamp)
      /**
       * Get sim id in database
       */
      sim_id.get_sql_simId(device_json.machine_id).then(get_simId_res=>{
        let sim_id_sql = get_simId_res[0].sim_id
        console.log(sim_id_sql)
        
        if(!sim_id_sql){
          /**
           * Update sim id in database
           */
          sim_id.get_simInfo(device_json.imei).then(sim_info=>{
            console.log(sim_info)
            sim_id.write_sim_sql(device_json.machine_id, sim_info.id)
            .then(write_sql_res=>{
              if(write_sql_res){
                console.log("Write sim_id into mysql successfully")
                wifilocation.wifilocation(fridge_id,device_json)
              }
            })
          })
        }
        else{
          wifilocation.wifilocation(fridge_id,device_json)
        }
      })
    })
  }
});

// fired when a client disconnects
server.on('clientDisconnected', function(client) {
  console.log('Client Disconnected:', client.id);
});

server.on('error',err=>{
  console.log("Error: ",err)
})