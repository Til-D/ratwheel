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

### Start Odometer on Startup
To execute the python script on startup make sure to install a cronjob using
``crontab -e``
and adding the following line to it:

    @reboot . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/odometer.py > /home/pi/logs/odometer.log &

## Node Express Server