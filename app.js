var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const schedule = require('node-schedule');

var mainRouter = require('./routes/main');
var registerRouter = require('./routes/register');
var loginRouter = require('./routes/login');
var freeboardRouter = require('./routes/freeboard');
var regionboardRouter = require('./routes/regionboard');
var mypageRouter = require('./routes/mypage');
var actionRouter = require('./routes/action');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', mainRouter);
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/freeboard', freeboardRouter);
app.use('/regionboard', regionboardRouter);
app.use('/mypage', mypageRouter);
app.use('/action', actionRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


/* 서버에서 자동으로 유저 포인트 지급하는 코드*/
/* firebase Web-App Configuration */
var firebase = require('firebase');
const admin = require('firebase-admin');
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
var serviceAccount = require("../Needs-web/service_account_key/lloginexample-firebase-adminsdk-7ekvt-a1fd2045eb.json");
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

let region_ref = db_admin.collection("data").doc("allData");

// sec, min, hour, day, mon, week
// ->매 01분 00초마다 실행한다는 뜻 (1시간 주기)
const r = schedule.scheduleJob('00 01 * * * *', function(){
  var region_list = [];
  region_ref.listCollections().then(collections => { //모든 지역구 정보를 가져옴
    collections.forEach(collection => {
      region_list.push(collection.id);
    });
    //각 지역을 순회하며 모든 good_num_m을 0으로 초기화
    region_list.forEach(function(element){
      region_ref.collection(element).get().then((snap) => {
        snap.forEach((doc) => {
          var data = doc.data();
          var doc_uid = data.document_name;
          region_ref.collection(element).doc(doc_uid).update({good_num_m : 0 });
        })
      })
    });
  });
});


// sec, min, hour, day, mon, week
// ->매 00분 00초마다 실행한다는 뜻 (1시간 주기)
const p = schedule.scheduleJob('00 00 * * * *', function() {
  var region_list = [];
  region_ref.listCollections().then(collections => {
    collections.forEach(collection => {
      region_list.push(collection.id);
    })
    var point_dict = {};
    var point_sum = 17000*region_list.length;
    var total_point = 0;
    // 각 지역을 순회하며 TOP3 Search
    console.log(region_list.length);
    region_list.forEach(function(element, index){
      // 각 지역 TOP3 good_num_m 을 descending으로 정렬
      region_ref.collection(element).orderBy("good_num_m", "desc").get().then((snap) => {
        var i = 0;
        snap.forEach((doc) => {
          var data = doc.data();
          // 1등
          if(i == 0){
            if(point_dict[data.id_uid]){
              point_dict[data.id_uid] = point_dict[data.id_uid] + 10000
              total_point += 10000;
            }
            else{
              point_dict[data.id_uid] = 10000
              total_point += 10000;
            }
          }
          // 2등
          if(i == 1){
            if(point_dict[data.id_uid]){
              point_dict[data.id_uid] = point_dict[data.id_uid] + 5000
              total_point += 5000;
            }
            else{
              point_dict[data.id_uid] = 5000
              total_point += 5000;
            }
          }
          // 3등
          if(i == 2){
            if(point_dict[data.id_uid]){
              point_dict[data.id_uid] = point_dict[data.id_uid] + 2000
              total_point += 2000;
            }
            else{
              point_dict[data.id_uid] = 2000
              total_point += 2000;
            }
          }
          i++;
        })
        // 유저에게 포인트 지급
        if(total_point == point_sum){
          reward(point_dict);
        }
      })
    });
  })
});
//포인트 지급을 synchronous하게 작동하도록 구현
async function reward(point_dict){
  for(var key in point_dict){
    await GivePoint(key, point_dict);
  }
}
// 포인트 지급 코드
function GivePoint(key, point_dict){
  let time_now = new Date();
  var time = time_now.toFormat('YYYY/MM/DD HH24:MM');
  var month = time_now.toFormat('MM'+"월");
  var user_ref = db_admin.collection("user").doc(key);
  user_ref.get().then((usersnap) => {
    if(usersnap.exists){
      console.log(key, point_dict[key]);
      var userData = usersnap.data();
      var cur_point = Number(userData.id_point);
      var new_point = String(cur_point + point_dict[key]);
      console.log(userData.id_uid, cur_point, "->", new_point);
      user_ref.update({
        id_point: new_point
      });
      user_ref.collection("pointHistory").doc().set({
        day: time,
        point: "+"+String(point_dict[key]),
        type: month+" 포인트 지급"
      })
    }
    else{
      console.log("탈퇴한 회원입니다.");
    }
  })
} 


module.exports = app;
