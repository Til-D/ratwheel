# Ratwheel Odometer
Odometer for the Science Gallery exhibit with server api.

## Raspberry Pi 
Components:
- Raspberry Pi 3 or 4
- Hall Sensor
	- VCC: connected to 3V3 power (pin 1)
	- Gnd: connected to Ground (pin 6)
	- Vout: connected to GPIO 17 (pin 11)
- Resistor 10k ohm

### Install Odometer Script
...

Make sure to set the following environment variables:
    
    export DEVICE_ID=ratwheel
    export SESSION_TIMEOUT=10.0

### Start Odometer on Startup
To execute the python script on startup make sure to install a cronjob using
``crontab -e``
and adding the following line to it:

    @reboot . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/odometer.py > /home/pi/logs/odometer.log &

To make sure the odometer pings the server in regular intervals also add the following cronjob:

    */1 * * * * . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/server_connection.py &

## Node Express Server

## TODOs
- set up cronjob to ping server in regular intervals
- server: read pings (last heard from on live feed)
- server: integrate likes
