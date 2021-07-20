var express = require('express');
var router = express.Router();
var moment = require('moment');
var axios = require('axios');
var os = require('os');

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
		topSpeed;

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
		tmpTotal += parseInt(session.rpm[i]);
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
		"status": status,
		"rotations": session.rotations,
		"tsStart": session.tsStart,
		"tsEnd": session.tsLast,
		"rpm": rpm, //current rpm
		"rpmTs": session.rpmTs,
		"kmh": kmh,
		"avgRpm": round(avgRpm),
		"totalMinutes": round(duration),
		"km": distance,
		"avgKmh": round(avgKmh),
		"topSpeed": round(topSpeed),
		"likes": session.likes,
		"likedBy": session.likedBy,
		"likesTs": session.likesTs,
		"mouseId": session.mouseId,
		"cheerCondition": session.cheerCondition
	}
	return result;
}

function getRandomInt(min, max) {
	return Math.max(Math.floor(Math.random() * max), min);
}

function cheerTimerTriggered(deviceId, app, host, cheerbotConfig) {

	var session = app.get('devices')[deviceId].session;
	var sessionStatus = session.status;

	console.log("+ cheerTimerTriggered(): " + session['deviceId'] + ' (' + session['cheerCondition'] + ')');

	// console.log('LULU');
	// console.log(app.get('devices')[session.deviceId]);
	// console.log('LALA');
	// console.log(session);

	if(sessionStatus==='active') {
			//set cheer burst
		var cheerCount;
		switch(session['cheerCondition']) {
			case "low":
				cheerCount = getRandomInt(cheerbotConfig.conditions.low.minCheers, cheerbotConfig.conditions.low.maxCheers);
				break;
			case "viral":
				cheerCount = getRandomInt(cheerbotConfig.conditions.viral.minCheers, cheerbotConfig.conditions.viral.maxCheers);
				break;
			default:
				cheerCount = 0;
		}

		console.log('scheduling ' + cheerCount + ' cheers');
		while(cheerCount>0) {

			var url = 'http://' + host + '/api/like';
			var triggerTime = getRandomInt(0, cheerbotConfig.burstInterval*1000);
			setTimeout(sendCheer, triggerTime, url, session);
			cheerCount--;
		}

		// set new cheer interval
		var startDelay = (cheerbotConfig.burstInterval + getRandomInt(cheerbotConfig.minDelay, cheerbotConfig.maxDelay)) * 1000; //ms
		console.log('+ setting new cheerTimer: ' + startDelay + ' (' + session.cheerCondition + ')');
		setTimeout(cheerTimerTriggered, startDelay, session.deviceId, app, host, cheerbotConfig);

	} else {
		console.log('- skipped. Session inactive.');
	}

	// [ERROR]: Maximum call stack size exceeded
	// var cheerTimer = app.get('devices')[session.deviceId].timer;
	// if(cheerTimer) { //already active cheerTimer
	// 	clearInterval(cheerTimer);
	// }
	// var startDelay = (cheerbotConfig.burstInterval + getRandomInt(cheerbotConfig.minDelay, cheerbotConfig.maxDelay)) * 1000; //ms
	// console.log('+ setting new cheerTimer: ' + startDelay + ' (' + session.cheerCondition + ')');
	// app.get('devices')[session.deviceId]['timer'] = setTimeout(cheerTimerTriggered, startDelay, session, app, host, cheerbotConfig);
}

function sendCheer(url, session) {

	// console.log("GOT CHEERS");
	axios
	  .post(url, {
	    deviceId: session['deviceId'],
	    likedBy: 'bot'
	  })
	  .then(res => {
	    // console.log(`statusCode: ${res.status}`)
	    // console.log(res)
	  })
	  .catch(error => {
	    console.error("[ERROR]: could not connect to: " + url);
	    // console.log(error);
	  })
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

	// OLD SIMULATOR
	// var couch = req.app.get('couch');

	// var limit = wheelConfig['history']; //max
	// if(req.query.limit && req.query.limit <= limit) {
	// 	limit = req.query.limit;
	// }

	// var params   = {include_docs: true, limit: limit, descending: true} 
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
	  	
	//   	var totalDistance = 0; 
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
	var ts = new Date().getTime();
	var couch = req.app.get('couch');
	var io = req.app.get('socketio');

	if(req.body.deviceId) {
		console.log('+ like received for: ' + req.body.deviceId);
		// console.log(req.body);

		if(devices[req.body.deviceId]) {
			var device = devices[req.body.deviceId];

			if(device.session && device.session.status==='active') {
				device.session.likes += 1;

				var likedBy;
				if(req.body.hasOwnProperty('likedBy')) {
					likedBy = req.body.likedBy;
				} else {
					likedBy = 'unknown';
				}

				if(!device.session.likedBy.hasOwnProperty(likedBy)) {
					device.session.likedBy[likedBy] = 0;
				}
				device.session.likedBy[likedBy] += 1;
				device.session.likesTs.push(ts);

				// console.log('session in cache updated:');
				// console.log(device.session);

				var result = {};
				result[device['session'].deviceId] = device;

				io.emit('like', result);
				res.send('ok');

		  	} else {
		  		res.send('error: no active session.');
		  	}
		} else {
			res.send('error: no device found: ' + req.body.deviceId);
		}
	} else { //no device specified

		console.log('+ generic like received');
		
		var likedBy;
		if(req.hasOwnProperty('body') && req.body.likedBy) {
			likedBy = req.body.likedBy;
		} else {
			likedBy = 'unknown';
		}

		var deviceIds = Object.keys(devices); 
		for(var i=0; i<deviceIds.length; i++) {
			var device = devices[deviceIds[i]];
			if(device.session && device.session.status==='active') {
				console.log('- adding like to: ' + deviceIds[i]);
				device.session.likes += 1;
				device.session.likesTs.push(ts);

				if(!device.session.likedBy.hasOwnProperty(likedBy)) {
					device.session.likedBy[likedBy] = 0;
				}
				device.session.likedBy[likedBy] += 1;
				}
		}
		io.emit('like', devices);
		res.send('ok');
	}

});

/* POST ROTATION */
router.post('/rpm', function(req, res, next) {

	console.log('rpm post received: ');
	console.log(req.body);

	var couch = req.app.get('couch');
	var wheelConfig = req.app.get('wheelConfig');
	var mouseId = req.app.get('mouseId');
	var cheerConditions = wheelConfig.cheerbot.conditions.probabilities;
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

  		var cheerCondition;
  		if(wheelConfig.cheerbot.enabled){
  			cheerCondition = cheerConditions[Math.floor(Math.random()*cheerConditions.length)];
  		} else {
  			cheerCondition = 'disabled';
  		}

  		var session = {
  			"deviceId": req.body.deviceId,
  			"rpm": [req.body.rpm],
  			"rpmTs": [req.body.ts],
  			"rotations": req.body.rotations,
  			"tsStart": req.body.ts,
  			"likes": 0,
  			"likesTs": [],
  			"likedBy": {},
  			"mouseId": mouseId,
  			"cheerCondition": cheerCondition
  		};
  		req.app.set('mouseId', ++mouseId);

  		// console.log('+ create new session');
  		// console.log(session);

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

  			// a cheerTimer consists of a startDelay, a scheduleDelay, and a density
  			// var cheerTimer = devices[session.deviceId].timer;
  			if(session.status==='active' && session.cheerCondition != 'none' && wheelConfig.cheerbot.enabled) {
	  			// if(cheerTimer) { //already active cheerTimer
	  			// 	clearInterval(cheerTimer);
	  			// }
  				var startDelay = getRandomInt(wheelConfig.cheerbot.minDelay, wheelConfig.cheerbot.maxDelay) * 1000; //ms
  				console.log('+ setting cheerTimer: ' + startDelay + ' (' + session.cheerCondition + ')');
				// devices[session.deviceId]['timer'] = setTimeout(cheerTimerTriggered, startDelay, session, req.app, req.get('host'), wheelConfig.cheerbot);
				setTimeout(cheerTimerTriggered, startDelay, session.deviceId, req.app, req.get('host'), wheelConfig.cheerbot);
	  			// console.log(cheerTimer);
				// req.app.set('cheerTimer', cheerTimer);
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
  		console.log('retrieving session: ' + req.body.sessionId);
  		couch.get(req.body.sessionId)
  		.then((body) => {
  			// console.log("Updating existing session:");
  			// console.log(body);

  			// update values
  			body.rpm.push(req.body.rpm);
  			body.rpmTs.push(req.body.ts);
  			body.rotations += req.body.rotations;
  			body.tsLast = req.body.ts;

  			// update likes
  			body['likes'] = devices[body.deviceId].session.likes;
  			body['likesTs'] = devices[body.deviceId].session.likesTs;
  			body['likedBy'] = devices[body.deviceId].session.likedBy;

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
	  				// console.log("+ session updated:");

	  				//cancel timer when all sessions become inactive
	  				var keys = Object.keys(devices); 
	  					oneActiveSession = false;
	  				for(var i=0; i<keys.length; i++) {

		  				if(devices[keys[i]].session && devices[keys[i]].session.status==='active') {
							oneActiveSession = true;
							break;
		  				}
	  				}
	  				if(!oneActiveSession) {
	  					if(devices[session.deviceId].timer) {
	  						console.log('- cheerTimer cancelled');
	  						clearTimeout(devices[session.deviceId].timer);
	  					} else {
	  						// console.log('no timer active.');
	  					}
	  				} else {
	  					// console.log('no active session');
	  				}

	  				console.log(session);
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
  			console.log(err);
  			res.send("Could not find session: " + req.body.sessionId);
  		});
  	}
});




module.exports = router;
