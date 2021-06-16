var express = require('express');
var router = express.Router();

// Helper functions
function calculateSessionParameters(session) {
	console.log('--processSession(): ');
	// console.log(session);

	var rpm,
		avgRpm,
		duration,
		distance,
		kmh,
		avgKmh,
		topSpeed;

	// current rpm
	if(session.rpm.length>0) {
		rpm = session.rpm[session.rpm.length-1];
	} else {
		rpm = 0;
	}

	// average rpms
	var tmpTotal = 0;
	for(var i=0; i<session.rpm.length; i++) {
		tmpTotal += session.rpm[i];
	}
	avgRpm = tmpTotal / session.rpm.length;

	// duration
	var start = new Date(session.tsStart),
		end = new Date(session.tsLast);
	// console.log(start);
	// console.log(end);
	var diff = end-start;
	duration = diff/(60*1000); //in minutes

	// distance
	distance = (session.rotations * (2 * Math.PI * session.diameter/2)/1000); //in km

	//km/h
	var speedInMeter = (rpm * (2 * Math.PI * session.diameter/2));
	kmh = speedInMeter * 60/1000;

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
		"sessionId": session._id,
		"rotations": session.rotations,
		"tsStart": session.tsStart,
		"tsEnd": session.tsLast,
		"rpm": rpm, //current rpm
		"kmh": kmh,
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
	var wheelConfig = req.app.get('wheelConfig');

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
	res.render('live', { title: 'Live Data' });
});

/* GET HISTORY */
router.get('/history', function(req, res, next) {

	// GET: http://localhost:3000/api/history?limit=10

	var wheelConfig = req.app.get('wheelConfig');
	var couch = req.app.get('couch');

	var limit = 100; //max
	if(req.query.limit && req.query.limit <= limit) {
		limit = req.query.limit;
	}

	var params   = {include_docs: true, limit: limit, descending: true} //TODO: sort by tsLast, needs to be done manually
	couch.list(params).then((body) => {

	  	var results = [];
		body.rows.forEach((row) => {

			var doc = row.doc;
			// add diameter to session
			var diameter;
			if (wheelConfig[doc.deviceId]) {
				diameter = wheelConfig[doc.deviceId].diameter;
			} else {
				console.log('WARNING: no diameter specified for: ' + doc.deviceId);
				diameter = 1;
			}
			doc['diameter'] = diameter;

			console.log(doc);
			results.push(calculateSessionParameters(doc));
		});
	  	
	  	res.send(results);

	});

	// test data

	// var example1 = {
	// 	"deviceId": "ratwheel",
	// 	"rpm": [12, 15, 21, 21, 11, 2, 0],
	// 	"sessionId": "1337", 
	// 	"rotations": 82, 
	// 	"tsStart": 1623317930688,
	// 	"tsLast": 1623318237100
	// };
	// var example2 = {
	// 	"deviceId": "ratwheel",
	// 	"rpm": [0, 12, 22, 11, 23, 24, 12, 2, 0],
	// 	"sessionId": "1338", 
	// 	"rotations": 45, 
	// 	"tsStart": 1623320272698,
	// 	"tsLast": 1623320355081
	// };
	// var example3 = {
	// 	"deviceId": "armwheel",
	// 	"rpm": [0, 20, 45, 55, 44, 53, 44, 21, 3, 0],
	// 	"sessionId": "1339", 
	// 	"rotations": 280, 
	// 	"tsStart": 1623320303545,
	// 	"tsLast": 1623320477771
	// };
	// var sessions = [example1, example2, example3].splice(0, limit);
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

	var couch = req.app.get('couch');
	var wheelConfig = req.app.get('wheelConfig');
	var io = req.app.get('socketio');

	// new session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "ratwheel", "rpm": 5, "sessionId": "new", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
	
	// unknown session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "armwheel", "rpm": 15, "sessionId": "1337", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'

	// update session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "armwheel", "rpm": 25, "sessionId": "ea416637143e74bc2983dd80f100578e", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
  	
	// CREATE NEW SESSION
  	if(!req.body.sessionId || req.body.sessionId == 'new') {
  		var session = {
  			"deviceId": req.body.deviceId,
  			"rpm": [req.body.rpm],
  			"rotations": req.body.rotations,
  			"tsStart": req.body.ts
  		};
  		couch.insert(session).then((body) => {
  			if(body.ok) {
  				console.log("New session created: " + body.id);
  			} else {
  				console.log("ERROR inserting new session:")
  				console.log(body);
  			}

  			session['_id'] = body.id;
  			session['_rev'] = body.rev;

  			var diameter;
			if (wheelConfig[session.deviceId]) {
				diameter = wheelConfig[session.deviceId].diameter;
			} else {
				console.log('WARNING: no diameter specified for: ' + session.deviceId);
				diameter = 1;
			}
			session['diameter'] = diameter;

  			session = calculateSessionParameters(session);

  			io.emit('update', session);
  			res.send(session);
  		});

  	} else {

  		// retrieve session from db
  		couch.get(req.body.sessionId)
  		.then((body) => {
  			console.log("Updating existing session:");
  			console.log(body);

  			// update values
  			body.rpm.push(req.body.rpm);
  			body.rotations += req.body.rotations;
  			body.tsLast = req.body.ts;
  			couch.insert(body).then((resp) => {
	  			if(resp.ok) {
	  				console.log("Session updated: " + resp.id);
	  				
	  				body['_rev'] = resp.rev;

	  				var diameter;
					if (wheelConfig[body.deviceId]) {
						diameter = wheelConfig[body.deviceId].diameter;
					} else {
						console.log('WARNING: no diameter specified for: ' + body.deviceId);
						diameter = 1;
					}
					body['diameter'] = diameter;
	  				var session = calculateSessionParameters(body);

	  				io.emit('update', session);
	  				res.send(session);
	  			} else {
	  				console.log("ERROR inserting new session:")
	  				console.log(resp);

	  				res.send(resp);
	  			}
	  		});
  		})
  		.catch((err) => {
  			console.log("Could not find session: " + req.body.sessionId);
  			// console.log(err);
  			res.send(404);
  		});
  	}
	// io.emit('update', {
	// 	"deviceId": req.body.deviceId,
	// 	"sessionId": req.body.sessionId,
	// 	"rpm": req.body.rpm,
	// 	"rotations": req.body.rpm,
	// 	"ts": req.body.ts
	// });

});




module.exports = router;
