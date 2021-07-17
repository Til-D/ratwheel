var express = require('express');
var router = express.Router();
var moment = require('moment');

var DATE_FORMAT = ("MMMM Do HH:mm");

// Helper functions
function calculateSessionParameters(session) {
	// console.log('--processSession(): ');
	// console.log(session);

	var status,
		rpm,
		avgRpm,
		duration,
		distance,
		kmh,
		avgKmh,
		topSpeed,
		likes;

	// current rpm
	if(session.rpm.length>0) {
		rpm = session.rpm[session.rpm.length-1];
	} else {
		rpm = 0;
	}

	if (rpm>0) {
		status = 'active';
	} else {
		status = 'inactive';
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

	// init likes
	if(session.likes) {
		likes = session.likes;
	} else {
		likes = 0;
	}

	result = {
		"deviceId": session.deviceId,
		"sessionId": session._id,
		"status": status,
		"rotations": session.rotations,
		"tsStart": session.tsStart,
		"tsEnd": session.tsLast,
		"rpm": rpm, //current rpm
		"kmh": kmh,
		"avgRpm": round(avgRpm),
		"totalMinutes": round(duration),
		"km": distance,
		"avgKmh": round(avgKmh),
		"topSpeed": round(topSpeed),
		"likes": likes,
		"mouseId": session.mouseId
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

	if(false) { //inactive
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
	  } else {
	  	res.send('offline');
	  }
});

/* GET livestream */
router.get('/live', function(req, res, next) {
	var devices = req.app.get('devices');
	res.render('live', { title: 'Live Data', devices: devices});
});

/* GET HISTORY */
router.get('/history', function(req, res, next) {

	// GET: http://localhost:3000/api/history?limit=10

	var wheelConfig = req.app.get('wheelConfig');
	var history = req.app.get('history');
	var couch = req.app.get('couch');

	var limit = wheelConfig['history']; //max
	if(req.query.limit && req.query.limit <= limit) {
		limit = req.query.limit;
	}

	var params   = {include_docs: true};
	couch.list(params).then((body) => {

	  	var totalDistance = 0;
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
			session = calculateSessionParameters(doc);
			// console.log(session);

			if(session['km']) {
				totalDistance += session['km'];
			}
		});
	  	
	  	history['totalKm'] = round(totalDistance);
	  	limit = limit * (-1);
	  	var result = {
	  		'totalKm': history['totalKm'],
	  		'sessions': history['sessions'].slice(limit) 
	  	}
	  	res.send(result);

	});

	// OLD
	// var couch = req.app.get('couch');

	// var limit = wheelConfig['history']; //max
	// if(req.query.limit && req.query.limit <= limit) {
	// 	limit = req.query.limit;
	// }

	// var params   = {include_docs: true, limit: limit, descending: true} //TODO: sort by tsLast, needs to be done manually
	// couch.list(params).then((body) => {

	//   	var results = [];
	// 	body.rows.forEach((row) => {

	// 		var doc = row.doc;
	// 		// add diameter to session
	// 		var diameter;
	// 		if (wheelConfig[doc.deviceId]) {
	// 			diameter = wheelConfig[doc.deviceId].diameter;
	// 		} else {
	// 			console.log('WARNING: no diameter specified for: ' + doc.deviceId);
	// 			diameter = 1;
	// 		}
	// 		doc['diameter'] = diameter;

	// 		// console.log(doc);
	// 		results.push(calculateSessionParameters(doc));
	// 	});
	  	
	//   	var totalDistance = 0; //TODO: read from whole database //in km
	//   	for(var i=0; i<results.length; i++) {
	//   		if(results[i]['km']) {
	//   			totalDistance += results[i]['km'];	
	//   		}
	//   	}
	//   	history = {
	//   		"totalKm": round(totalDistance),
	//   		"sessions": results
	//   	}
	//   	res.send(history);

	// });

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
	
	// curl -X POST http://localhost:3000/api/ping -d '{"deviceId": "armwheel"}' -H 'Content-Type: application/json'
	// curl -X POST https://45.113.235.98/api/ping -d '{"deviceId": "ratwheel"}' -H 'Content-Type: application/json'

	var devices = req.app.get('devices');
	var io = req.app.get('socketio');

	if(req.body.deviceId) {
		console.log('ping received from: ' + req.body.deviceId);

		if(devices[req.body.deviceId]) {
			var device = devices[req.body.deviceId];
			device['last_ping'] = moment(Date.now()).format(DATE_FORMAT);
		}
	} else {
		console.log('ping received from: unknown');
	}
	io.emit('ping', devices);
	res.send('ok');
});

/* POST LIKE */
router.post('/like', function(req, res, next) {
	
	// curl -X POST http://localhost:3000/api/like -d '{"deviceId": "armwheel"}' -H 'Content-Type: application/json'
	// curl -X POST http://45.113.235.98/api/like -d '{"deviceId": "ratwheel"}' -H 'Content-Type: application/json'

	var devices = req.app.get('devices');
	var couch = req.app.get('couch');
	var io = req.app.get('socketio');

	if(req.body.deviceId) {
		console.log('like received for: ' + req.body.deviceId);

		if(devices[req.body.deviceId]) {
			var device = devices[req.body.deviceId];

			if(device.session) {
				device.session.likes += 1
			
				//update session in db
				// retrieve session from db
		  		couch.get(device.session.sessionId)
		  		.then((body) => {
		  			console.log("Updating likes in session:");
		  			console.log(body);

		  			// update values
		  			body.likes = device.session.likes;
		  			couch.insert(body).then((resp) => {
			  			if(resp.ok) {
			  				console.log("Session updated: " + resp.id);
			  			} else {
			  				console.log("ERROR updating session:")
			  				console.log(resp);
			  			}
			  		});
		  		})
		  		.catch((err) => {
		  			console.log("Could not find session: " + req.body.sessionId);
		  			// console.log(err);
		  			res.send(404);
		  		});
		  	} else {
		  		console.log("No active session in progress.");
		  	}
		}
	} else { //no device specified > TODO: award like to whichever device is currently active

	}
	io.emit('like', devices);
	res.send('ok');
});

/* POST ROTATION */
router.post('/rpm', function(req, res, next) {

	console.log('rpm post received: ');
	console.log(req.body);

	var couch = req.app.get('couch');
	var wheelConfig = req.app.get('wheelConfig');
	var mouseId = req.app.get('mouseId');
	var cheerConditions = req.app.get('cheerConditions');
	var io = req.app.get('socketio');
	var devices = req.app.get('devices');
	var history = req.app.get('history');

	// new session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "ratwheel", "rpm": 5, "sessionId": "new", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
	
	// unknown session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "armwheel", "rpm": 15, "sessionId": "1337", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'

	// update session
	// curl -X POST http://localhost:3000/api/rpm -d '{"deviceId": "armwheel", "rpm": 25, "sessionId": "fc6bb1930ca1352fac0f27d949003425", "rotations": 12, "ts": 62}' -H 'Content-Type: application/json'
  	
	// CREATE NEW SESSION
  	if(!req.body.sessionId || req.body.sessionId == 'new') {

  		var cheerCondition = cheerConditions[Math.floor(Math.random()*cheerConditions.length)];

  		var session = {
  			"deviceId": req.body.deviceId,
  			"rpm": [req.body.rpm],
  			"rotations": req.body.rotations,
  			"tsStart": req.body.ts,
  			"likes": 0,
  			"mouseId": mouseId,
  			"cheerCondition": cheerCondition
  		};
  		req.app.set('mouseId', ++mouseId);

  		console.log('+ create new session');
  		console.log(session);

  		couch.insert(session)
  		.then((body) => {
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

  			//add to history
  			history['sessions'].push(session); //add to back of queue
  			if(history['sessions'].length > wheelConfig['history']) {
  				history['sessions'].shift(); //remove first 
  			}

  			devices[session.deviceId]['session'] = session;
  			io.emit('update', session);
  			res.send(session);
  		})
  		.catch((err) => {
  			console.log("ERROR: could not create new session");
  			console.log(err);
  			res.send('error');
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

	  				//update history
	  				var in_history = false;
	  				for(i=history['sessions'].length-1; i>=0; i--) {
	  					var h_session = history['sessions'][i];
	  					if(h_session['sessionId']==session['sessionId']) {
	  						history['sessions'][i] = session;
	  						in_history = true;
	  						break;
	  					}
	  				}
	  				if(!in_history) { //unknown session? > add to back of queue
	  					history['sessions'].push(session); 
			  			if(history['sessions'].length > wheelConfig['history']) {
			  				history['sessions'].shift(); //remove first 
			  			}
	  				}

	  				devices[session.deviceId]['session'] = session;
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
