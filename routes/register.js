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
var fb_auth = firebase.auth();  //authentication

/* GET register page */
router.get('/', function(req, res) {
    res.render('register');
});

/* POST nickname overlap check listener */
router.get('/check', function(req, res){
    console.log(req.query.nickname);
    var param_nickname = req.query.nickname;
    var overlap_flag = false;
    db.collection("user").orderBy("id_nickName", "desc").get()
        .then((snapshot) => {
            var rows=[];
            snapshot.forEach((doc) => {
                var childData = doc.data();
                if(param_nickname == childData.id_nickName){
                overlap_flag = true;
                }
            });
            if(overlap_flag == true) {
                console.log("같은 닉네임이 이미 존재합니다.");
                res.json(1);
            }
            else {
                console.log("해당 닉네임은 사용 가능합니다.");
                res.json(0);
            }
        }
    );
});

/* POST sign-up event listener */
router.post('/', function(req, res) {
    var param_name = req.body.userName;
    var param_nickname = req.body.nickName;
    var param_email = req.body.email01 + "@" + req.body.email02;
    var param_region = req.body.regionName;
    var param_pw = req.body.userPw;
    console.log(param_email, " ", param_pw);
    fb_auth.createUserWithEmailAndPassword(param_email, param_pw)
        .then(function(data) {
            //회원 가입 완료시 자동 로그인 되도록 설정
            //자동 로그인 되기 이전에 DB에 회원 정보 추가
            var user = fb_auth.currentUser;
            var uid;
            if(user != null){
                uid = user.uid;
            }
            var nowDate = new Date();
            var time = nowDate.toFormat('YYYY/MM/DD HH24:MM:ss');
            var day = nowDate.toFormat('DD');
            db.collection("user").doc(uid).set({ //user 컬렉션 DB생성
                id_email: user.email,
                id_name: param_name,
                id_nickName: param_nickname,
                id_region: param_region,
                id_point: "10",
                id_uid: uid
            });
            db.collection("user").doc(uid).collection("pointHistory").doc().set({
                day: time,
                point: "+10",
                type: "회원가입 지급 포인트"
            });
            db.collection("user").doc(uid).collection("pointDay").doc(user.email+"pointDay").set({
                pointDay: day,
                pointLimit: "5"
            });

            fb_auth.signInWithEmailAndPassword(param_email, param_pw)
                .then(function(data){
                    //로그인 -> 메인페이지로 넘어감
                    res.redirect('/');
                })
                .catch(function(error) {
                    res.send(`
                    <script type="text/javascript">
                        alert("error occurred while signing up.");
                    </script>`);
                    console.log(error);  
                });
        })
        .catch(function(error) {
            //Handle Error here -> 이메일 중복, 유효하지 않은 이메일 등
            res.send(`
            <script type="text/javascript">
                alert("error occurred while creating id.");
                history.back();
            </script>`);
            console.log(error);
        }
    );
});


module.exports = router;
