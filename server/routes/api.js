var express = require('express');
var router = express.Router();

/* GET simulator */
router.get('/simulator', function(req, res, next) {
  res.send('tbd: simulator');
});

/* GET livestream */
router.get('/live', function(req, res, next) {
  res.send('tbd: live');
});

/* GET HISTORY */
router.get('/history', function(req, res, next) {
  res.send('tbd: history');
});

router.get('/', function(req, res, next) {
  res.send('ok');
});



/* POST PING */
router.post('/ping', function(req, res, next) {
  res.send('ok');
});

/* POST ROTATION */
router.post('/rotation', function(req, res, next) {
  res.send('ok');
});




module.exports = router;
