import os
import mysql.connector
from mysql.connector import errorcode
import config from './config'

try:
    f = open('/root/IoT_Backend/temp/mqttLog','r')
    lines = f.readline()
    if lines:
        print(lines)
        os.system("sudo rm /root/IoT_Backend/temp/mqttLog")
        os.system("sudo killall mosquitto_sub")
        os.system("nohup mosquitto_sub -h localhost -t test -u"+config.MQTT_USER+"-P"+config.MQTT_PWD+" > /root/IoT_Backend/temp/mqttLog &")
        os.system("ps aux | grep mosquitto_sub")
except:
    print("There is no such file")
    os.system("sudo killall mosquitto_sub")
    os.system("nohup mosquitto_sub -h localhost -t test -u"+config.MQTT_USER+"-P"+config.MQTT_PWD+" > /root/IoT_Backend/temp/mqttLog &")
    print(os.system("ps aux | grep mosquitto_sub"))

