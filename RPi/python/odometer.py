#!/usr/bin/python
#--------------------------------------
#
#       Odometer
#
# This script uses a hall sensor on GPIO17.
#
# Author : Tilman Dingler
# Date   : 17/06/2021
#
# https://www.github.com/Til-D/ratwheel.git
#
#--------------------------------------

import time
import datetime
import RPi.GPIO as GPIO
import os
from functools import reduce
import threading

from server_connection import *
from TimerReset import *

# returns current timestamp in ms
def now():
    return round(time.time()*1000)

def trigger_timeout():
  print("## TIMEOUT ##")

  global timedout
  global session_id
  global rotations
  global rpms
  global timer

  if(not timedout): # notify server that wheel has stopped
      post_rotations(SERVER_URL, DEVICE_ID, [0], session_id, rotations, now())
  
  # init new session
  session_id = "new"
  rotations = 0
  rpms = []
  timedout = True
  timer = None

# Globals
GRANULARITY = 1 #determines how many rotations determine rpm
SERVER_URL = SERVER_PROD
DEVICE_ID = os.environ['DEVICE_ID']
TIMEOUT = float(os.environ['SESSION_TIMEOUT']) #sec

ts_last = 0
pole_last = 1 #HIGH
session_id = "new"
rotations = 0
rpms = []
timedout = False
timer = None

def sensorCallback(channel):
  # Called if sensor output changes
  timestamp = now()
  stamp = datetime.datetime.fromtimestamp(time.time()).strftime('%H:%M:%S')
  pole = GPIO.input(channel)
  global ts_last
  global pole_last
  global session_id
  global rotations
  global rpms
  global timedout
  global timer
  
  if pole:
    # No magnet
    print("Sensor HIGH " + stamp)
    # pass
    
  else:
    # Magnet
    print("Sensor LOW " + stamp)
    
    # calculate rpm
    diff = timestamp - ts_last #ms
    
    if(ts_last > 0 and diff > 0):
        
      timeout = TIMEOUT * 1000 #ms
      if(diff < timeout):

        if(timer is not None):
            timer.reset()
        else:
            if(timer):
              timer.start()
            else:
              timer = TimerReset(TIMEOUT, trigger_timeout)
              timer.start()
              
        timedout = False
    
        diff = diff/(60*1000) #min
        rpm = round(1/diff, 2)
 
        rotations += 1
        rpms.append(rpm)
      
        if(rotations == GRANULARITY):
          
          avg_rpm = round(reduce(lambda a, b: a+b, rpms) / len(rpms), 2)
        
          print("rpm: " + str(avg_rpm) + ", rotations: " + str(rotations)) 
          
          # send rpm to server and rempty rotations
          num_rotations = rotations # save value before emptying
          rotations = 0
          rpms = []
          session_id = post_rotations(SERVER_URL, DEVICE_ID, avg_rpm, session_id, num_rotations, timestamp)
          print('+ session id: ' + session_id)
          
      else: #timeout
          pass
          
    pole_last = pole
    ts_last = timestamp
  
def main():
  # Wrap main content in a try block so we can
  # catch the user pressing CTRL-C and run the
  # GPIO cleanup function. This will also prevent
  # the user seeing lots of unnecessary error
  # messages.

  # Get initial reading
  sensorCallback(17)

  try:
    # Loop until users quits with CTRL-C
    while True :
      time.sleep(0.1)

  except KeyboardInterrupt:
    # Reset GPIO settings
    GPIO.cleanup()

# Tell GPIO library to use GPIO references
GPIO.setmode(GPIO.BCM)

print("Device id: " + DEVICE_ID)
print("Timeout interval: " + str(TIMEOUT))
# print("Setup GPIO pin as input on GPIO17")
ping_server(SERVER_URL, DEVICE_ID)

# Set Switch GPIO as input
# Pull high by default
GPIO.setup(17 , GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.add_event_detect(17, GPIO.BOTH, callback=sensorCallback, bouncetime=200)

if __name__=="__main__":
   main()
        