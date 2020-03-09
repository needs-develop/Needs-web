var express = require('express');
var router = express.Router();
var firebase = require('firebase');
require('date-utils');
var session = require('express-session');

/* firebase Web-App Configuration */
var firebase_config = {
  apiKey: "AIzaSyCE59at8BFrqn84RG63hn1uS_NhNrnPuso",
  authDomain: "lloginexample.firebaseapp.com",
  databaseURL: "https://lloginexample.firebaseio.com",
  projectId: "lloginexample",
  storageBucket: "lloginexample.appspot.com",
  messagingSenderId: "124851004056",
  appId: "1:124851004056:web:b58239166f9907ce3926ed",
  measurementId: "G-CR5E843ZEM"
};

/* Initialize Firebase */
if (!firebase.apps.length) {
  firebase.initializeApp(firebase_config);
}
var db = firebase.firestore();  //firestore

/* GET home page. */
router.get('/', function(req, res, next) {
  var user = firebase.auth().currentUser;

  if(user){
    console.log("---------유저등장---------");   
    var uid = user.uid;
    
    db.collection('user').doc(uid).get()   // user 데이터로부터 지역 가져옴
        .then((doc) => {
            res.render('main_login', {region: doc.data().id_region});
        });
  }
              
  else {
    console.log("---------유저없음---------");
    res.render('main_logout');
  }
});


module.exports = router;
