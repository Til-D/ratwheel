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

SERVER_PROD = 'http://45.113.235.98'
SERVER_TEST = 'http://localhost:3000'

DEVICE_ID = 'ratwheel_test'

def main():

	ping_server(SERVER_PROD, DEVICE_ID)
	post_rotations(SERVER_PROD, DEVICE_ID, 54, "test1337", 120, int(time.time()))

def ping_server(server_url, device_id):
	ping_url = server_url + '/api/ping'
	ping = requests.post(ping_url, json={"deviceId": device_id})
	print('- ping sent to server: ' + ping_url)
	print('+ status code: ' + str(ping.status_code))
	print('+ repsonse: ' + ping.text)

def post_rotations(server_url, device_id, rpm, session_id, rotations, ts):
	post_url = server_url + '/api/rpm'
	obj = {
		"deviceId": device_id,
		"rpm": rpm,
		"sessionId": session_id,
		"rotations": rotations,
		"ts": ts
	}
	r = requests.post(post_url, json=obj)
	print('- rpm sent to server: ' + post_url)


	print('+ status code: ' + str(r.status_code))
	print('+ repsonse: ' + r.text)

if __name__=="__main__":
   main()
