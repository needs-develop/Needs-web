var express = require('express');
var router = express.Router();
var firebase = require('firebase');
require('date-utils');
var session = require('express-session');
var moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

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
    console.log("---------로그인---------");   
    var uid = user.uid;
    var freeData_ref = db.collection("freeData").orderBy("good_num", "desc");
    var freeData_timeref = db.collection("freeData").orderBy("day", "desc");
    var data_ref = db.collection("data").doc("allData");
    var user_ref = db.collection("user").doc(uid);

    var freebestpost = [];
    var freetimepost = [];
    var regionbestpost = [];
    var regiontimepost = [];
    //자유게시판 좋아요 순으로 정렬
    freeData_ref.get().then((freepostsnap) => {
      if(freepostsnap){
        var i = 0;  //4개만 가져옴
        freepostsnap.forEach((freesnap) => {
          i++;
          if(i<=4){
            freebestpost.push(freesnap.data());
          }
        })
        //자유게시판 최신순으로 정렬
        freeData_timeref.get().then((freepostsnap2) => {
          if(freepostsnap2){
            var k = 0;
            freepostsnap2.forEach((freesnap2) => {
              k++;
              if(k<=4){
                var freesnap2_data = freesnap2.data();
                freesnap2_data.day = moment(freesnap2_data.day).format("MM/DD HH:mm:ss");
                freetimepost.push(freesnap2_data);
              }
            });
            // user 데이터로부터 지역 가져옴
            user_ref.get().then((doc) => {
              var data = doc.data();  //사용자 정보
              var region = data.id_region;

              // 사용자 지역의 인기글을 좋아요 순으로 읽어옴
              data_ref.collection(region).orderBy("good_num", "desc").get()
                .then((regionpostsnap) => {
                  if(regionpostsnap){
                    var j = 0;
                    regionpostsnap.forEach((regionsnap) => {
                      j++;
                      if(j<=4){
                        regionbestpost.push(regionsnap.data());
                      }
                    });
                    
                    data_ref.collection(region).orderBy("day", "desc").get().then((regionpostsnap2) => {
                      if(regionpostsnap2){
                        var l = 0;
                        regionpostsnap2.forEach((regionsnap2) => {
                          l++;
                          if(l<=4){
                            var regionsnap2_data = regionsnap2.data();
                            regionsnap2_data.day = moment(regionsnap2_data.day).format("MM/DD HH:mm:ss");
                            regiontimepost.push(regionsnap2_data);
                          }
                        });
                        //4가지 섹션대로.
                        res.render('main_login', {region: region, fbp: freebestpost, ftp: freetimepost, rbp: regionbestpost, rtp: regiontimepost});
                      }
                    });

                    // pointDay, pointLimit
                    var id_email = data.id_email;
                    var user_pointDay_ref = user_ref.collection('pointDay').doc(id_email+'pointDay');
                    user_pointDay_ref.get()
                      .then((doc2) => {
                        // pointDay와 오늘 날짜가 다르면 pointDay를 오늘 날짜로 변경
                        var pointDay = doc2.data().pointDay;
                        
                        var nowDate = new Date();
                        var today = nowDate.toFormat('DD');
                      
                        if(pointDay != today) {
                            user_pointDay_ref.update( {pointDay: today, pointLimit: "5"} );
                        }
                    });
                  }
                });
            });
          }
        });
      }
    });
  }
  else {
    console.log("---------유저없음---------");
    res.render('main_logout');
  }
});


/* GET Logout function */
router.get('/logout', function(req, res, next) {
  firebase.auth().signOut().then(function() {
    res.redirect('/');
  }).catch(function(err) {
    console.log(err);
  });
});

module.exports = router;
