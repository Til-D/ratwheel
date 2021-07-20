
var $events = document.getElementById('events');
var $ratwheel_speed = document.getElementById('ratwheel_speed');
var $armwheel_speed = document.getElementById('armwheel_speed');
var $ratwheel_ping = document.getElementById('last_ping_ratwheel');
var $armwheel_ping = document.getElementById('last_ping_armwheel');
var $ratwheel_likes = document.getElementById('ratwheel_likes');
var $armwheel_likes = document.getElementById('armwheel_likes');

// function onchange() {
//   var rpm = $input.value;
//   var duration = 60 / rpm;
//   $div.style.animationDuration = duration + 's';
// }

// var  socket_url = ':' + SOCKET_PORT;
console.log('connecting to socket');
var socket = io();

// init rpm
var rpm = parseInt($ratwheel_speed.innerHTML);
if(rpm>0) {
	var duration = 60 / rpm;
	document.getElementById('ratwheel').style.animationDuration = duration + 's';
}
rpm = parseInt($armwheel_speed.innerHTML);
if(rpm>0) {
	var duration = 60 / rpm;
	document.getElementById('armwheel').style.animationDuration = duration + 's';
}


socket.on('update', function(data) {
	console.log('update received:');
	console.log(data);

	if(data.status=='active') {
		var duration = 60 / data.rpm;
		document.getElementById(data.deviceId).style.animationDuration = duration + 's';

		if(data.deviceId=='ratwheel') {
			$ratwheel_speed.textContent = data.rpm;
			$ratwheel_likes.textContent = data.likes;
		}
		if(data.deviceId=='armwheel') {
			$armwheel_speed.textContent = data.rpm;
			$armwheel_likes.textContent = data.likes;
		}
	} else {
		document.getElementById(data.deviceId).style.animationDuration = 0 + 's';
		if(data.deviceId=='ratwheel') {
			$ratwheel_speed.textContent = '0';
			$ratwheel_likes.textContent = '0';
		}
		if(data.deviceId=='armwheel') {
			$armwheel_speed.textContent = '0';
			$armwheel_likes.textContent = '0';
		}
	}
	

    var item = document.createElement('li');
    item.textContent = data.deviceId + ': ' + data.rpm + ' rpm (session: ' + data.sessionId + '), status: ' + data.status;
    $events.appendChild(item);
  });

socket.on('ping', function(data) {
	console.log('ping received:');
	console.log(data);

	if(data.ratwheel && data.ratwheel.last_ping) {
		$ratwheel_ping.textContent = data.ratwheel.last_ping;
	}

	if(data.armwheel && data.armwheel.last_ping) {
		$armwheel_ping.textContent = data.armwheel.last_ping;
	}
});

socket.on('like', function(data) {
	console.log('like received:');
	console.log(data);

	if(data.ratwheel && data.ratwheel.session && data.ratwheel.session.status==='active') {
		$ratwheel_likes.textContent = data.ratwheel.session.likes;
	}

	if(data.armwheel && data.armwheel.session && data.armwheel.session.status==='active') {
		$armwheel_likes.textContent = data.armwheel.session.likes;
	}
});