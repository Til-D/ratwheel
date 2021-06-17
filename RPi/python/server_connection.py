#!/usr/bin/python
#--------------------------------------
# 
# Author : Tilman Dingler
# Date   : 15/06/2021
#
# https://...
#
#--------------------------------------
import time
import datetime
import requests
import os
import json

SERVER_PROD = 'http://45.113.235.98'
SERVER_TEST = 'http://localhost:3000'


def main():

    ping_server(SERVER_PROD, os.environ['DEVICE_ID'])
    post_rotations(SERVER_PROD, os.environ['DEVICE_ID'], 54, "new", 120, int(time.time()))

def ping_server(server_url, device_id):
    ping_url = server_url + '/api/ping'
    try:
        ping = requests.post(ping_url, json={"deviceId": device_id})
        print('- ping sent to server: ' + ping_url)
        # print('+ status code: ' + str(ping.status_code))
        print('+ repsonse: ' + ping.text)
    except:
        print('ERROR: no connection to server: ' + server_url)

def post_rotations(server_url, device_id, rpm, session_id, rotations, ts):
    post_url = server_url + '/api/rpm'
    obj = {
        "deviceId": device_id,
        "rpm": rpm,
        "sessionId": session_id,
        "rotations": rotations,
        "ts": ts
    }
    try:
        r = requests.post(post_url, json=obj)
        print('- rpm sent to server: ' + post_url)

        # print('+ status code: ' + str(r.status_code))
        # print('+ repsonse: ' + r.text)
        
        if(r.status_code==200):
            session = json.loads(r.text)
            return session.get('sessionId')
    except:
        print('ERROR: no connection to server: ' + server_url)
        return "new"

if __name__=="__main__":
   main()
