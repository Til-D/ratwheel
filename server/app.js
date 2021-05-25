var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var app = express();
var db = {  
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
};
console.log('Database:');
console.log(db);

const nano = require('nano')(process.env.COUCHDB_URL)
nano.db.create(process.env.DB_NAME).then((data) => {
  // success - response is in 'data'
  console.log('New database created: ' + process.env.DB_NAME);
}).catch((err) => {
  // failure - error information is in 'err'
  console.log('Database already exists: ' + process.env.DB_NAME);
})

const couch = nano.use(process.env.DB_NAME);

var per_page = 10;
var params   = {include_docs: true, limit: per_page, descending: true}
couch.list(params, function(error,body,headers) {
  console.log(body);
});

// HIER WEITERMACHEN


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

module.exports = couch
module.exports = app;
