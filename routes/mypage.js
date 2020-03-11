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


/* GET myPost page. freeboard */
router.get('/myPost/freeboard', function(req, res, next) {
	var uid = fb_auth.currentUser.uid;
	var page = Number(req.query.page);
	if(!page){	
		page = 1; 
	}
	db.collection("user").doc(uid).collection("write").get()
		.then((usersnap) => {
			if(usersnap.size != 0){
				var post_info = [];
				usersnap.forEach((snap) => {	//유저가 쓴 글 몽땅 불러옴
					var post = snap.data();
					if(post.data == "freeData"){
						post_info.push(post);
					}
				});
				//document_name을 사용하여 freeData collection에서 글을 가져옴.
				var my_post = [];
				post_info.forEach(function(element, index) {
					db.collection("freeData").doc(element.document_name).get()
						.then((post_snapshot) => {
							var data = post_snapshot.data();
							my_post.push(data);
							if(index == post_info.length - 1){
								res.render('mypage/myPost', {boardType: "freeData", board: my_post, page: page});
							}
						})
				});
			}
			else{
				res.render('mypage/myPost', {boardType: '', board: '', page: ''});
			}
		})
		.catch((err) => {
			console.log("Error getting my post", err);
		});
});


/* GET myPost page. regionboard */
router.get('/myPost/regionboard', function(req, res, next) {
	
});


/* GET postRead page */
router.get('/postRead', function(req, res, next) {
	var uid = fb_auth.currentUser.uid;
	var doc_name = req.query.document_name;
	var my_post_ref = db.collection("freeData").doc(doc_name);
	if(req.query.boardType == "freeData"){
		my_post_ref.get()
			.then((postsnap) => {
				var doc = postsnap.data();
				var page = req.query.page;
				if(req.query.visitNew == 1){	//글을 처음 읽을 때만 조회수 증가
					var visit = doc.visit_num + 1;
					my_post_ref.update({visit_num: visit});
					doc.visit_num += 1;
				}

				var userData;
				db.collection("user").doc(uid).get()	//닉네임, 이메일 가져옴
					.then((usersnap) => {
						var data = usersnap.data();
						userData = {
							id_nickName : data.id_nickName,
							id_email: data.id_email
						}
					})
				console.log(userData);

				var reply = [];
				my_post_ref.collection("reply").orderBy("timeReply").get()
					.then((replysnap) => {
						replysnap.forEach((reply_doc) => {
							var reply_data = reply_doc.data();
							reply_data.data_doc = doc.document_name;
							reply.push(reply_data);
						});
						res.render('mypage/postRead', {board: doc, page: page, reply: reply, user: userData})
					})

			})
			.catch((err) => {
				console.log(err);
			})
	}
	else{

	}


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
