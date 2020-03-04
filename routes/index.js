var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

//router.get('/user', function(req, res, next) {
//    res.render('test_user');
//});

//router.get('/board', function(req, res, next) {
//    res.render('test_board');//});

module.exports = router;

