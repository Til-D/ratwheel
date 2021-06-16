var $input = document.getElementById("rpm");
var $div = document.querySelector("div");
var $history = document.getElementById("rathistory");
var $deviceSelection = document.getElementById("deviceSelection");

console.log($input, $div);

$input.addEventListener("change", onchange, false);
$deviceSelection.addEventListener("change", onchange, false);

function onchange() {
  var rpm = $input.value;
  var duration = 60 / rpm;
  $div.style.animationDuration = duration + 's';

	// submit changes to server
	var request = new XMLHttpRequest();
	var data = {
		"deviceId": $deviceSelection.value,
		 "rpm": rpm,
		 "sessionId": "new",
		 "rotations": 0, 
		 "ts": Date.now()
	}
	request.open("POST", "/api/rpm");
	request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	request.onreadystatechange = function() {
		if(this.readyState === 4 && this.status === 200) {
			console.log(this.responseText);
		}
	};
	console.log('- updating server...');
	console.log(data);
	request.send(JSON.stringify(data));  
}

onchange();

var request = new XMLHttpRequest();
request.open("GET", "/api/simulator");
request.onreadystatechange = function() {
	if(this.readyState === 4 && this.status === 200) {
		var result = JSON.parse(this.responseText);
		var ratwheel;
		for(var i=0; i<=result.length; i++) {
			if(result[i] && result[i].deviceId === 'ratwheel') {
				ratwheel = result[i];
			}
		}
		if(ratwheel.status === 'inactive') {
			console.log('wheel inactive');
			$input.value = 0;
			$div.style.animationDuration = 0 + 's';
		} else {
			console.log('wheel active');
			$input.value = ratwheel.avgRpm;
			$div.style.animationDuration = 60 / ratwheel.avgRpm + 's';
		}
	}
};
request.send();

var historyRequest = new XMLHttpRequest();
historyRequest.open("GET", "/api/history");
historyRequest.onreadystatechange = function() {
	if(this.readyState === 4 && this.status === 200) {
		var result = JSON.parse(this.responseText);
		console.log(result);
		for(var i=0; i<=result.length; i++) {
			var record = result[i];
			if(record) {
				var li = document.createElement("li");
				var txt = record.deviceId + " (session: " + record.sessionId + "): " + record.totalMinutes + " minutes, " + record.km + " kilometers, " + "average speed: " + record.avgKmh + "km/h, top speed: " + record.topSpeed + "km/h";
				li.appendChild(document.createTextNode(txt));
				$history.appendChild(li);
			} 
		}
	}
};
historyRequest.send();