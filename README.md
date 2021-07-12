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
    
    export SERVER_PROD=http://ratwheelserver.com
    export DEVICE_ID=ratwheel
    export SESSION_TIMEOUT=10.0
    export SUBMISSION_FREQUENCY=1
    export MAGNET_ANGLE=180

``SERVER_PROD`` indicates the IP address or domain of the data server.``DEVICE_ID`` identifies the device, ``SESSION_TIMEOUT`` sets the time interval (in seconds) for a new session to start (i.e., if the wheel does not turn for the specified time, the device creates a new session for a new user), and ``SUBMISSION_FREQUENCY`` determines the frequency in which the current rpm are sent to the server. ``MAGNET_ANGLE`` describes how far the magnets are apart to be able to discount rpm.

### Start Odometer on Startup
To execute the python script on startup make sure to install a cronjob using
``crontab -e``
and adding the following line to it:

    @reboot . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/odometer.py > /home/pi/logs/odometer.log &

To make sure the odometer pings the server in regular intervals also add the following cronjob:

    */1 * * * * . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/server_connection.py &

# Node Express Server

Install packages using ``npm install``. Start via ``npm start``.

## TODOs
- server: hold session history in memory
