# ratwheel
Odometer for the Science Gallery exhibit with server api

## Start Odometer on Startup
To execute the python script on startup make sure to install a cronjob using
``crontab -e``
and adding the following line to it:
| @reboot . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/odometer.py > /home/pi/logs/odometer.log &
