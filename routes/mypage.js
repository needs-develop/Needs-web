var express = require('express');
var router = express.Router();
var firebase = require('firebase');
require('date-utils');
var session = require('express-session');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
var urlencode = require('urlencode');

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

var serviceAccount = require("../service_account_key/lloginexample-firebase-adminsdk-7ekvt-a1fd2045eb.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lloginexample.firebaseio.com"
  });
}

let db_admin = admin.firestore();

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
                let my_region = data.id_region;
				let my_point = data.id_point;
				res.render('mypage/mypage', {email: my_email, name: my_name, nickName: my_nickName, region: my_region, point: my_point});
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
				let my_region = data.id_region;
				var region_list = [];
				let region_ref = db_admin.collection("data").doc("allData");
				region_ref.listCollections().then(collections => {
					collections.forEach(collection => {
						region_list.push(collection.id);
					});
					res.render('mypage/editInfo', {nickName: my_nickName, region: my_region, region_list: region_list});
				})
			}
		})
		.catch(err => {
			console.log("error getting doc", err);
		});
});


/* POST change NickName page. */
router.post('/editInfo', function(req, res, next) {
	res.redirect('/');
});


/* POST change NickName page. */
router.post('/editInfo/nickName', function(req, res, next) {
	// 닉네임 수정
	var param_nick = req.body.nickName;
	var uid = fb_auth.currentUser.uid;
	db.collection("user").doc(uid).update({
		id_nickName: param_nick,
	});
	res.send(`<script type="text/javascript">
			alert("닉네임 변경이 완료되었습니다!");
			document.location.href="/mypage/editInfo"
		</script>`);
});

/* POST editInfo page. */
router.post('/editInfo/region', function(req, res, next) {
	// 지역정보 수정
	var param_region = req.body.new_region;
	var uid = fb_auth.currentUser.uid;
	db.collection("user").doc(uid).update({
		id_region: param_region,
	});
	res.send(`<script type="text/javascript">
			alert("지역 정보 변경이 완료되었습니다!");
			document.location.href="/mypage/editInfo"
		</script>`);
});



/* GET myPost page. freeboard */
router.get('/myPost/freeboard', function(req, res, next) {
	var uid = fb_auth.currentUser.uid;
	var page = Number(req.query.page);
	if(!page){	
		page = 1; 
	}
	var post_info = [];
	var my_post = [];
	db.collection("user").doc(uid).collection("write").get()
		.then((usersnap) => {
			if(usersnap.size != 0){
				usersnap.forEach((snap) => {	//유저가 쓴 글 몽땅 불러옴
					var post = snap.data();
					if(post.data == "freedata"){	//자유게시판
						post_info.push(post);
					}
				});
				if(post_info.length == 0){
					res.render('mypage/myPost', {boardType: '', board: my_post, page: '', address: ''});
				}
				//document_name을 사용하여 freeData collection에서 글을 가져옴.
				post_info.forEach(function(element, index) {
					db.collection("freeData").doc(element.document_name).get()
						.then((post_snapshot) => {
							var data = post_snapshot.data();
							my_post.push(data);
							if(index == post_info.length - 1){
								console.log(my_post.length);
								res.render('mypage/myPost', {boardType: "freeData", board: my_post, page: page, address: ''});
							}
						})
				});
			}
			else{
				res.render('mypage/myPost', {boardType: '', board: my_post, page: '', address: ''});
			}
		})
		.catch((err) => {
			console.log("Error getting my post", err);
		});
});


/* GET myPost page. regionboard */
router.get('/myPost/regionboard', function(req, res, next) {
	var uid = fb_auth.currentUser.uid;
	var page = Number(req.query.page);
	if(!page){	
		page = 1; 
	}
	var post_info = [];
	var my_post = [];
    var address = [];
	db.collection("user").doc(uid).collection("write").get()
		.then((usersnap) => {
			if(usersnap.size != 0){
				usersnap.forEach((snap) => {	//유저가 쓴 글 몽땅 불러옴
					var post = snap.data();
					if(post.data == "data"){		//지역게시판
						post_info.push(post);
					}
				});
				if(post_info.length == 0){
					res.render('mypage/myPost', {boardType: '', board: my_post, page: '', address: ''});
				}
				post_info.forEach(function(element, index) {
					db.collection("data").doc('allData').collection(element.address).doc(element.document_name).get()
						.then((post_snapshot) => {
							var data = post_snapshot.data();
							my_post.push(data);
                            address.push(element.address);
                        
							if(index == post_info.length - 1){
								res.render('mypage/myPost', {boardType: "data", board: my_post, page: page, address: address});
							}
						})
				});
			}
            else{
				res.render('mypage/myPost', {boardType: '', board: my_post, page: '', address: ''});
			}
		})
		.catch((err) => {
			console.log(err);
		});
});


/* GET myLikePost page. */
router.get('/myLikePost', function(req, res, next) {
	var page = Number(req.query.page);
	if(!page){	
		page = 1; 
	}
	var uid = fb_auth.currentUser.uid;
	var user_ref = db.collection("user").doc(uid).collection("like");
	var my_like = [];
	user_ref.get().then((likesnap) => {
		likesnap.forEach((snap) => {
			var data = snap.data();
			my_like.push(data);
		});

		var region_ref = db.collection("data").doc("allData");
		var free_ref = db.collection("freeData");
		if(my_like.length == 0){
			res.render('mypage/myPost', {boardType: '', board: my_like, page: '', address: ''});
		}
		var post = [];
		var address = [];
		var boardType = [];
		my_like.forEach(function(element, index){
			if(element.data == "data"){			//지역게시판
				region_ref.collection(element.address).doc(element.document_name).get()
				.then((postsnap_region) => {
					var data = postsnap_region.data();
					post.push(data);
					address.push(element.address);
					boardType.push("data");
					if(index == my_like.length - 1){
						res.render("mypage/myLikePost", {
							boardType: boardType,
							board: post,
							page: page,
							address: address
						});
					}
				})
			}
			else if(element.data == "freedata"){	//자유게시판
				free_ref.doc(element.document_name).get()
				.then((postsnap_free) => {
					var data = postsnap_free.data();
					post.push(data);
					address.push("");
					boardType.push("freeData");
					if(index == my_like.length - 1){
						res.render("mypage/myLikePost", {
							boardType: boardType,
							board: post,
							page: page,
							address: address
						});
					}
				})
			}
		})
	})
});


/* GET myCommentPost page. */
router.get('/myCommentPost', function(req, res, next) {
	var page = Number(req.query.page);
	if(!page){	
		page = 1; 
	}
	var uid = fb_auth.currentUser.uid;
	var user_ref = db.collection("user").doc(uid).collection("reply");
	var my_reply = [];
	user_ref.get().then((replysnap) => {
		replysnap.forEach((snap) => {
			var data = snap.data();
			my_reply.push(data);
		});
		var region_ref = db.collection("data").doc("allData");
		var free_ref = db.collection("freeData");
		if(my_reply.length == 0){
			res.render('mypage/myPost', {boardType: '', board: my_reply, page: '', address: ''});
		}
		var post = [];
		var address = [];
		var boardType = [];
		my_reply.forEach(function(element, index){
			if(element.data == "data"){		//지역게시판
				region_ref.collection(element.address).doc(element.document_name).get()
				.then((postsnap_region) => {
					var data = postsnap_region.data();
					post.push(data);
					address.push(element.address);
					boardType.push("data");
					if(index == my_reply.length - 1){
						console.log(post, boardType, address);
						res.render("mypage/myCommentPost", {
							boardType: boardType,
							board: post,
							page: page,
							address: address
						});
					}
				})
			}
			else if(element.data == "freedata"){
				free_ref.doc(element.document_name).get()
				.then((postsnap_free) => {
					var data = postsnap_free.data();
					post.push(data);
					address.push("");
					boardType.push("freeData");
					if(index == my_reply.length - 1){
						console.log(post, boardType, address);
						res.render("mypage/myCommentPost", {
							boardType: boardType,
							board: post,
							page: page,
							address: address
						});
					}
				})
			}
		})
	})
});


module.exports = router;
