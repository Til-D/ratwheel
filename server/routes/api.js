var express = require('express');
var router = express.Router();

// Helper functions
function calculateSessionParameters(session) {
	console.log('--processSession(): ');
	console.log(session);

	var avgRpm,
		duration,
		distance,
		avgKmh,
		topSpeed;

	// average rpms
	var tmpTotal = 0;
	for(var i=0; i<session.rpm.length; i++) {
		tmpTotal += session.rpm[i];
	}
	avgRpm = tmpTotal / session.rpm.length;

	// duration
	var start = new Date(session.tsStart),
		end = new Date(session.tsLast);
	console.log(start);
	console.log(end);
	var diff = end-start;
	duration = diff/(60*1000); //in minutes

	// distance
	distance = (session.rotations * (2 * Math.PI * session.diameter/2)/1000); //in km

	// average kmh
	avgKmh = distance / (duration / 60);

	// top speed
	var maxRpm = session.rpm.reduce(function (a, b) {
		return Math.max(a, b);
	});
	var distanceInMeter = (maxRpm * (2 * Math.PI * session.diameter/2));
	topSpeed = distanceInMeter * 60/1000;

	result = {
		"deviceId": session.deviceId,
		"sessionId": session.sessionId,
		"rotations": session.rotations,
		"tsStart": session.tsStart,
		"tsEnd": session.tsLast,
		"avgRpm": round(avgRpm),
		"totalMinutes": round(duration),
		"km": round(distance),
		"avgKmh": round(avgKmh),
		"topSpeed": round(topSpeed)
	}
	return result;
}

/**
	rounds to 2 decimals
*/
function round(num) {
	return Math.round(num * 100 + Number.EPSILON)/100;
}

/* GET simulator */
router.get('/simulator', function(req, res, next) {

	// results are dependent on hour and minute
	var end = new Date();
	var tsLast = end.getTime();
	var hour = end.getHours();
	var minutes = end.getMinutes();
	var diff = (minutes % 10)+1;
	var duration = minutes-(diff);
	end.setMinutes(duration);
	var tsStart = end.getTime();
	var wheelConfig = req.app.settings.wheelConfig;

	var rotationsRatwheel = diff * 25;
	var rotationArmwheel = diff * 65; 
  
	var example1 = {
		"deviceId": "ratwheel",
		"rpm": [12, 8, 11, 12, 22, 11, 23, 25, 26, 25, 26, 22, 21, 19, 21, 24, 12, 8, 12, 11].splice(0, diff),
		"sessionId": "P1337", 
		"rotations": rotationsRatwheel, 
		"tsStart": tsStart,
		"tsLast": tsLast
	};
	var example2 = {
		"deviceId": "armwheel",
		"rpm": [22, 20, 45, 55, 44, 53, 44, 53, 51, 42, 44, 46, 33, 35, 25, 21, 18, 11, 12, 8].splice(0, diff),
		"sessionId": "P8932", 
		"rotations": rotationArmwheel, 
		"tsStart": tsStart,
		"tsLast": tsLast
	};

	var sessions = [example1, example2];

	var results = [];

	for (var i=0; i<sessions.length; i++) {

		// add diameter to session
		var diameter;
		if (wheelConfig[sessions[i].deviceId]) {
			diameter = wheelConfig[sessions[i].deviceId].diameter;
		} else {
			console.log('WARNING: no diameter specified for: ' + sessions[i].deviceId);
			diameter = 1;
		}
		sessions[i]['diameter'] = diameter;
		results.push(calculateSessionParameters(sessions[i]));
	}

	// deactivate every 10min
	if(diff==1) { //ratwheel
		results[0] = {
			"deviceId": "ratwheel",
			"status": "inactive"
		};
	} else {
		results[0]["status"] = "active";
	}

	if(diff==6) {
		results[1] = {
			"deviceId": "armwheel",
			"status": "inactive"
		};
	} else {
		results[1]["status"] = "active";
	}
  	
  	res.send(results);
});

/* GET livestream */
router.get('/live', function(req, res, next) {
	// TODO: retrieve current sessions from database
  	res.send('offline');

  	// TODO set up a socket
});

/* GET HISTORY */
router.get('/history', function(req, res, next) {

	// GET: http://localhost:3000/api/history?limit=10

	var wheelConfig = req.app.settings.wheelConfig;

	var limit = 100; //max
	if(req.query.limit && req.query.limit <= limit) {
		limit = req.query.limit;
	}

	// TODO: query database and return last N sessions
	// var per_page = 10;
	// var params   = {include_docs: true, limit: per_page, descending: true}
	// couch.list(params, function(error,body,headers) {
	//   console.log(body);
	// });

	var example1 = {
		"deviceId": "ratwheel",
		"rpm": [12, 15, 21, 21, 11, 2, 0],
		"sessionId": "1337", 
		"rotations": 82, 
		"tsStart": 1623317930688,
		"tsLast": 1623318237100
	};
	var example2 = {
		"deviceId": "ratwheel",
		"rpm": [0, 12, 22, 11, 23, 24, 12, 2, 0],
		"sessionId": "1338", 
		"rotations": 45, 
		"tsStart": 1623320272698,
		"tsLast": 1623320355081
	};
	var example3 = {
		"deviceId": "armwheel",
		"rpm": [0, 20, 45, 55, 44, 53, 44, 21, 3, 0],
		"sessionId": "1339", 
		"rotations": 280, 
		"tsStart": 1623320303545,
		"tsLast": 1623320477771
	};
	var sessions = [example1, example2, example3].splice(0, limit);

	var results = [];
	for (var i=0; i<sessions.length; i++) {

		// add diameter to session
		var diameter;
		if (wheelConfig[sessions[i].deviceId]) {
			diameter = wheelConfig[sessions[i].deviceId].diameter;
		} else {
			console.log('WARNING: no diameter specified for: ' + sessions[i].deviceId);
			diameter = 1;
		}
		sessions[i]['diameter'] = diameter;
		results.push(calculateSessionParameters(sessions[i]));
	}
  	
  	res.send(results);
});

router.get('/', function(req, res, next) {
  res.send('ok');
});


/* POST PING */
router.post('/ping', function(req, res, next) {
	
	// curl -X POST http://localhost:3000/api/ping -d '{"deviceId": "ratwheel"}' -H 'Content-Type: application/json'

	if(req.body.deviceId) {
		console.log('ping received from: ' + req.body.deviceId);

		// TODO: update db 'last heard from' (dashboard function)
	} else {
		console.log('ping received from: unknown');
	}
	
  res.send('ok');
});

/* POST ROTATION */
router.post('/rpm', function(req, res, next) {

	console.log('rpm post received: ');
	console.log(req.body);

	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "ratwheel", "rpm": 33, "sessionId": "new", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "ratwheel", "rpm": 33, "sessionId": "1337", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
  	
  	if(!req.body.sessionId || req.body.sessionId == 'new') {
  		console.log('creating new session in db');
  		// TODO create new session in db with deviceId, [rpm], tsStart=ts, rotations=rotations
  	} else {
  		console.log('updating session in db: ' + req.body.sessionId);
  		// TODO update session tsLast=ts, append rpm, rotations+=rotations
  	}

  	//TODO: send back session record database id
	res.send('ok');
});




module.exports = router;
