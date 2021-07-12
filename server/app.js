var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var fs = require('fs')
var yaml = require('js-yaml')

var app = express();

const nano = require('nano')(process.env.COUCHDB_URL);
var couch;
nano.db.create(process.env.DB_NAME).then((data) => {
  // success - response is in 'data'
  console.log('New database created: ' + process.env.DB_NAME);
  couch = nano.use(process.env.DB_NAME);
  app.set('couch', couch);
}).catch((err) => {
  // failure - error information is in 'err'
  console.log('Connected to existing database: ' + process.env.DB_NAME);
  couch = nano.use(process.env.DB_NAME);
  app.set('couch', couch);
})

// read wheel config
var wheelConfig;
try {
    fileContents = fs.readFileSync('./wheel_config.yaml', 'utf8');
    wheelConfig = yaml.load(fileContents);

    console.log("Wheel Configurations:");
    console.log(wheelConfig);
} catch (e) {
    console.log('ERROR reading wheel config:')
    console.log(e);
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// set local variables
app.set('wheelConfig', wheelConfig);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// enable Cross Origin Resource Sharing (CORS)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// global state variables
app.set('devices', {
  "ratwheel": {},
  "armwheel": {},
  "testwheel": {}
});

app.set('history', {
  "totalKm": 0,
  "sessions": []
});

app.set('mouseId', 0); // human-readable, incrementing participant id

module.exports = app;

// server.listen(3000, "127.0.0.1") //port