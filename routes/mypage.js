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
	var uid = fb_auth.currentUser.uid;
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

/* GET editInfo page. */
router.get('/editInfo', function(req, res, next) {
	console.log("개인정보 수정 페이지");
	var uid = fb_auth.currentUser.uid;
	db.collection("user").doc(uid).get()
		.then(doc => {
			if(!doc.exists){
				console.log("error occurred");
			}
			else {
				let data = doc.data();
				let my_nickName = data.id_nickName;
				res.render('mypage/editInfo', {nickName: my_nickName});
			}
		})
		.catch(err => {
			console.log("error getting doc", err);
		})
});

/* POST editInfo page. */
router.post('/editInfo', function(req, res, next) {
	//개인정보 수정
	console.log("개인정보 수정 완료 버튼");
	var param_nick = req.body.nickName;
	var uid = fb_auth.currentUser.uid;
	db.collection("user").doc(uid).update({id_nickName: param_nick});
	res.redirect("/mypage");
});


/* GET myPost page. */
router.get('/myPost', function(req, res, next) {
	console.log("페이지 제대로 띄움");
	res.render("mypage/myPost");
});

/* GET myLikePost page. */
router.get('/myLikePost', function(req, res, next) {
	console.log("페이지 제대로 띄움");
	res.render("mypage/myLikePost");
});

/* GET myCommentPost page. */
router.get('/myCommentPost', function(req, res, next) {
	console.log("페이지 제대로 띄움");
	res.render("mypage/myCommentPost");
});


module.exports = router;
