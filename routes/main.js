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
    var freeData_ref = db.collection("freeData").orderBy("good_num", "desc");
    var data_ref = db.collection("data").doc("allData");
    var user_ref = db.collection("user").doc(uid);

    var freebestpost = [];
    var regionbestpost = [];
    freeData_ref.get()
      .then((freepostsnap) => {
        if(freepostsnap){
          var i = 0;
          freepostsnap.forEach((freesnap) => {
            i++;
            if(i<=4){
              freebestpost.push(freesnap.data());
            }
          })
          console.log(freebestpost);
          //이 부분 callback 함수 어떻게 처리해야할 지 모르겠어서 then 안에 넣었어요.ㅜㅜ
          user_ref.get()   // user 데이터로부터 지역 가져옴
            .then((doc) => {
              var data = doc.data();  //사용자 정보
              var region = data.id_region;
              data_ref.collection(region).get()
                .then((regionpostsnap) => {
                  if(regionpostsnap){
                    var j = 0;
                    regionpostsnap.forEach((regionsnap) => {
                      j++;
                      if(j<=4){
                        regionbestpost.push(regionsnap.data());
                      }
                    });
                    res.render('main_login', {region: region, freeDataPost: freebestpost, regionDataPost: regionbestpost});
                  }
                })
            });
        }
      })
  }
  else {
    console.log("---------유저없음---------");
    res.render('main_logout');
  }
});


module.exports = router;
