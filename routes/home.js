var express = require('express');
var router = express.Router();
var firebase = require('firebase');
require('date-utils');

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

/* GET home page. */
router.get('/', function(req, res, next) {
  var user = fb_auth.currentUser;
  if(user){
    console.log("---------유저등장--------");
    res.redirect('/main');
  }
  else {
    console.log("---------유저없음---------");
    res.render('home.html');
  }
});

/* GET Email Login page */
router.get('/emailLogin', function(req, res, next){
  res.render('login.html');
})

/* POST Email Login event listener */
router.post('/email_login', function(req, res) {
  var param_email = req.body.email01 + "@" + req.body.email02;
  var param_pw = req.body.userPw;
  fb_auth.signInWithEmailAndPassword(param_email, param_pw)
    .then(function(firebaseUser) {
      res.redirect("/main");
    })
    .catch(function(error) {  //알람메세지 띄우고 뒤로가기
      res.send(`
        <script type="text/javascript">
          alert("등록되지 않은 사용자입니다.");
          history.back();
        </script>`
      );
    });
});

/* GET Google Login & Create DB for new user */
router.get('/google_login', function(req, res){
  var token = req.query.token;
  var credential = firebase.auth.GoogleAuthProvider.credential(null, token);
 
  fb_auth.signInWithCredential(credential).then(function(result){
    var uid = result.user['uid'];
    var email = result.user['email'];
    var name = result.user['displayName'];
    let data = {
      id_email: email,
      id_name: name,
      id_nickName: "None",
      id_point: 10,
      id_uid: uid
    }
    var nowDate = new Date();
    var time = nowDate.toFormat('YYYY/MM/DD HH24:MM');
    var day = nowDate.toFormat('DD');
    let user_db = db.collection("user").doc(uid);
    user_db.get().then(doc => {
      if(!doc.exists){    //새로운 회원의 경우 DB를 생성한다.
        db.collection("user").doc(uid).set(data);
        db.collection("user").doc(uid).collection("pointHistory").doc().set({
          day: time,
          point: "+10",
          type: "회원가입 지급 포인트"
        });
        db.collection("user").doc(uid).collection("pointDay").doc(email+"pointDay").set({
          pointDay: day,
          pointLimit: "5"
        });
      }
      else{
        console.log("DB already Exist");
      }
    })
    .catch(err => {
      console.log("ERROR");
    });
    res.redirect('/main');
  })
});

/* GET Facebook Login & Create DB for new user */
router.get('/facebook_login', function(req, res){
  var token = req.query.token;
  var credential = firebase.auth.FacebookAuthProvider.credential(token);
 
  fb_auth.signInWithCredential(credential).then(function(result){
    var uid = result.user['uid'];
    var email = result.user['email'];
    var name = result.user['displayName'];
    let data = {
      id_email: email,
      id_name: name,
      id_nickName: "None",
      id_point: 10,
      id_uid: uid
    }
    var nowDate = new Date();
    var time = nowDate.toFormat('YYYY/MM/DD HH24:MM');
    var day = nowDate.toFormat('DD');
    let user_db = db.collection("user").doc(uid);
    user_db.get().then(doc => {
      if(!doc.exists){    //새로운 회원의 경우 DB를 생성한다.
        db.collection("user").doc(uid).set(data);
        db.collection("user").doc(uid).collection("pointHistory").doc().set({
          day: time,
          point: "+10",
          type: "회원가입 지급 포인트"
        });
        db.collection("user").doc(uid).collection("pointDay").doc(email+"pointDay").set({
          pointDay: day,
          pointLimit: "5"
        });
      }
      else{
        console.log("DB already Exist");
      }
    })
    .catch(err => {
      console.log("ERROR");y
    });
    res.redirect('/main');
  })
});


module.exports = router;
