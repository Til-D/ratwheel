# Ratwheel Odometer
Odometer for the Science Gallery exhibit with server api.

The project consists of the odometer running on a [Raspberry Pi](/RPi) and the corresponding [Node Server](/server). The server connnects to CouchDB using [nano](https://www.npmjs.com/package/nano).

Additionally, a cheer bot can be activated to cheer runners on.

## Raspberry Pi 
Components:
- Raspberry Pi 3 or 4
- Hall Sensor
	- VCC: connected to 3V3 power (pin 1)
	- Gnd: connected to Ground (pin 6)
	- Vout: connected to GPIO 17 (pin 11)
- Resistor 10k ohm

### Install Odometer Script

Make sure to set the following environment variables:
    
    export SERVER_PROD=http://ratwheelserver.com
    export DEVICE_ID=ratwheel
    export SESSION_TIMEOUT=10.0
    export SUBMISSION_FREQUENCY=1
    export MAGNET_ANGLE=180

``SERVER_PROD`` indicates the IP address or domain of the data server.``DEVICE_ID`` identifies the device, ``SESSION_TIMEOUT`` sets the time interval (in seconds) for a new session to start (i.e., if the wheel does not turn for the specified time, the device creates a new session for a new user), and ``SUBMISSION_FREQUENCY`` determines the frequency in which the current rpm are sent to the server. ``MAGNET_ANGLE`` describes how far the magnets are apart to be able to discount rpm.

Also, make sure to set the timezone of the device, e.g.:

    sudo timedatectl set-timezone Australia/Melbourne

### Start Odometer on Startup
To execute the python script on startup make sure to install a cronjob using
``crontab -e``
and adding the following line to it:

    @reboot . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/odometer.py > /home/pi/logs/odometer.log &

To make sure the odometer pings the server in regular intervals also add the following cronjob:

    */1 * * * * . $HOME/.profile; python /home/pi/code/ratwheel/RPi/python/server_connection.py &

# Node Express Server

Install packages using ``npm install``. Start via ``npm start``.

## API

The server receives updates from wheels via the [API](server/routes/api.js). The following routes are available:

- GET
    - ``/api/live``: live dashboard showing wheel activity. Examples for how to process server responses can be found in [live.js](server/public/javascripts/live.js).
    - ``/api/history?limit=N``: loads the last ``N`` sessions from the server's cache. The most current sessions are listed last.
    - ``/api/simulator``: *deprecated*. Used to generate fake wheel activity.
- POST
    - ``/api/rpm``: receives odometer updates. Parameters include ``deviceId``, ``rpm`` (rotations per minute), ``sessionId``, ``rotations``, and a timestamp (``ts``). If no ``sesionId`` is specified or ``sessionId`` is set to *new*, the server creates a new session and returns the ``sessionId`` from the corresponding database entry. The ``rotations`` should specify the rotations the wheel made since the last update. The server will add rotations and process the session, returning a session object with the following parameters:

    { 
        deviceId: 'armwheel',
        sessionId: '51050eaa7eeb5bcac3519db8130a29bc',
        status: 'inactive',
        rotations: 0.014866666666666667,
        tsStart: 1626769990064,
        tsEnd: 1626769990572,
        rpm: '0',
        kmh: 0.21,
        avgRpm: 1, 
        totalMinutes: 0.04,
        km: 0.00003035825700918937,
        avgKmh: 0.22,
        topSpeed: 0.25,
        likes: 2,
        likedBy: { bot: 2 },
        mouseId: 1,
        cheerCondition: 'viral' 
    }

    - The ``mouseId`` is a human-readable, incrementing identifier, which is reset with each server relaunch. 
        - example call: ``curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "ratwheel", "rpm": 5, "sessionId": "new", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'``
    - ``/api/like``: likes are collected device-specific or general. If no ``deviceId`` is specified, the like will be added to all active sessions. Optionally, likes can be signed according to where they come from (e.g., a bot or human agent).
        - example call (generic): ``curl -X POST http://localhost:3000/api/like -d '{}' -H 'Content-Type: application/json'``
        - example call (device-specific): ``curl -X POST http://localhost:3000/api/like -d '{"deviceId": "armwheel"}' -H 'Content-Type: application/json'``
        - example call (including source): ``curl -X POST http://localhost:3000/api/like -d '{"deviceId": "armwheel", "likedBy": "human"}' -H 'Content-Type: application/json'``
    - ``/api/ping``: odometers ping the server regardless of wheel activity. Status can be monitoried via ``/api/live``. 
        - example call: ``curl -X POST http://localhost:3000/api/ping -d '{"deviceId": "armwheel"}' -H 'Content-Type: application/json'``

## WheelConfig

Wheel and server variables are configured in [wheel_config.yaml](server/wheel_config.yaml). For each device, ``diameter`` and ``deviceId`` can be set. Additionally, the server provides a cheer bot, designed to like up active sessions. When a new session is created, the server randomly picks a condition from ``cheerbot.conditions``. A timer is started with a random interval between ``minDelay`` and ``maxDelay``. Once the timer is triggered and if the session is still active, a burst of *likes* are scheduled in the time interval specified as ``burstInterval``. How many cheers are scheduled depends on the condition and the values specified as ``minCheers`` and ``maxCheers``.

## Author
- [Tilman Dingler](https://github.com/Til-D/)

## Articles about the Installation
- [Running on Rainbows](https://pursuit.unimelb.edu.au/articles/running-on-rainbows), in *Pursuit*, 19 July 2021

## License
This application is published under the [MIT license](http://www.opensource.org/licenses/mit-license) and [GPL v3](http://opensource.org/licenses/GPL-3.0). 