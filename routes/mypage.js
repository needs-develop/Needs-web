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
var fb_auth = firebase.auth();

/* GET mypage page. */
router.get('/', function(req, res, next) {
	var uid = fb_auth.currentUser['uid'];
	//db.collection("user").doc(uid).set(data);
	//console.log(user['uid']);
	db.collection("user").doc(uid).get()
		.then(doc => {
			if(!doc.exists){
				console.log("error occurred");
			}
			else {
				let data = doc.data();
				let my_email = data.id_email;
				let my_name = data.id_name;
				let my_nickName = data.id_nickName;
				let my_point = data.id_point;
				res.render('mypage/mypage', {email: my_email, name: my_name, nickName: my_nickName, point: my_point});
			}
		})
		.catch(err => {
			console.log("error getting doc", err);
		})
});



module.exports = router;
