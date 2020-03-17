var express = require('express');
var router = express.Router();
var firebase = require("firebase");
var dateFormat = require('dateformat');
// 서울 현재 시간 불러오기 위해 필요한 모듈
var moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");


// Needs firebase(GoogleLoginExample)
var firebaseConfig = {
    apiKey: "AIzaSyCE59at8BFrqn84RG63hn1uS_NhNrnPuso",
    authDomain: "lloginexample.firebaseapp.com",
    databaseURL: "https://lloginexample.firebaseio.com",
    projectId: "lloginexample",
    storageBucket: "lloginexample.appspot.com",
    messagingSenderId: "124851004056",
    appId: "1:124851004056:web:b58239166f9907ce3926ed",
    measurementId: "G-CR5E843ZEM"
};

if (!firebase.apps.length) {
    var app = firebase.initializeApp(firebaseConfig);
}
var db = firebase.firestore(app);




// 알림 메시지
router.get('/', function(req,res,next){
    var page = Number(req.query.page);
    var uid = firebase.auth().currentUser.uid;
    
    if (!page) {    // 그냥 action으로 이동할 경우 1페이지를 보여줌
        page = 1;
    }

    db.collection('user').doc(uid).collection('action').orderBy("day", "desc").get()  // 날짜의 내림차순으로 정렬
        .then((snapshot) => {
            var action_data = [];
            snapshot.forEach((doc) => {
                action_data.push(doc.data());
            });

            db.collection('user').doc(uid).get()
                .then((doc2) => {
                    var id_region = doc2.data().id_region;
                    res.render('action', {action: action_data, region: id_region, page: page});
                });

            
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});



module.exports = router;
