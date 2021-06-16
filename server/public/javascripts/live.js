
var $events = document.getElementById('events');

// function onchange() {
//   var rpm = $input.value;
//   var duration = 60 / rpm;
//   $div.style.animationDuration = duration + 's';
// }

// var  socket_url = ':' + SOCKET_PORT;
console.log('connecting to socket');
var socket = io();
socket.on('update', function(data) {
	console.log('update received:');
	console.log(data);

	var duration = 60 / data.rpm;
	document.getElementById(data.deviceId).style.animationDuration = duration + 's'

    var item = document.createElement('li');
    item.textContent = data.deviceId + ': ' + data.rpm + 'rpm (session: ' + data.sessionId + ')';
    $events.appendChild(item);
  });