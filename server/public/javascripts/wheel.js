var $input = document.getElementById("rpm");
var $div = document.querySelector("div");
var $history = document.getElementById("rathistory");
var $deviceSelection = document.getElementById("deviceSelection");
var $controlButton = document.getElementById("controlButton");

var wheelActive = false,
    sessionId = "new",
    tsStart = 0,
    rpm = 0;

// console.log($input, $div);

$input.addEventListener("change", onchange, false);
$controlButton.addEventListener("click", buttonClick, false);
// $deviceSelection.addEventListener("change", onchange, false);

function buttonClick() {
    if(wheelActive) { //shut down
        console.log('stop wheel');

        $deviceSelection.disabled = false;
        $input.value=0;
        $input.disabled = true;
        onchange();

        $controlButton.textContent = 'Start Session';
        $controlButton.classList.remove("red");
        $controlButton.classList.add("green");
        wheelActive = false;
        sessionId = "new";
    } else { //start wheel
        console.log('start wheel');
        tsStart = new Date().getTime();

        $deviceSelection.disabled = true;
        $input.disabled = false;

        $controlButton.textContent = 'Stop Session';
        $controlButton.classList.remove("green");
        $controlButton.classList.add("red");
        wheelActive = true;
    }
}

function onchange() {

  //calculate rotations
  var tsCurrent = new Date().getTime();
  var diff = (tsCurrent - tsStart); //ms
  var diffMin = diff/(60*1000); //minutes
  var rotations = diffMin * rpm;
  // console.log('diff: ' + diff + ', in min: ' + diffMin, 'rotations: ' + rotations);

  var duration;
  rpm = $input.value;
  if(rpm>0) {
    duration = 60 / rpm;
  } else {
    duration = 0;
  }
  console.log('rpm: ' + rpm + ', duration: ' + duration);

  $div.style.animationDuration = duration + 's';

  // submit changes to server
  var request = new XMLHttpRequest();
  var data = {
      "deviceId": $deviceSelection.value,
       "rpm": rpm,
       "sessionId": sessionId,
       "rotations": rotations, //TODO: calculate rotations based on timestamps
       "ts": Date.now()
  }
  request.open("POST", "/api/rpm");
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.onreadystatechange = function() {
      if(this.readyState === 4 && this.status === 200) {
          var resp = JSON.parse(this.responseText);
          console.log(resp);

          if(resp.sessionId && resp.status === 'active') {
              sessionId = resp.sessionId;
          }
      }
  };
  console.log('- updating server...');
  console.log(data);
  request.send(JSON.stringify(data));  
  tsStart = tsCurrent;
}

// onchange();

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
        } else {
            console.log('wheel active');
            $input.value = ratwheel.avgRpm;
            $div.style.animationDuration = 60 / ratwheel.avgRpm + 's';
        }
    }
};
// request.send();

var historyRequest = new XMLHttpRequest();
historyRequest.open("GET", "/api/history");
historyRequest.onreadystatechange = function() {
    if(this.readyState === 4 && this.status === 200) {
        var result = JSON.parse(this.responseText);
        console.log(result);
        for(var i=0; i<=result['sessions'].length; i++) {
            var record = result['sessions'][i];
            if(record) {
                var li = document.createElement("li");
                var txt = record.deviceId + " (session: " + record.sessionId + "): " + record.totalMinutes + " minutes, " + record.km + " kilometers, " + "average speed: " + record.avgKmh + "km/h, top speed: " + record.topSpeed + "km/h";
                li.appendChild(document.createTextNode(txt));
                $history.appendChild(li);
            } 
        }
    }
};
// historyRequest.send();