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

// sec, min, hour, day, mon, week
// ->매 00초마다 실행한다는 뜻
schedule.scheduleJob('00 * * * * *', function() {
  let time_now = new Date();
  var time = time_now.toFormat('YYYY/MM/DD HH24:MM');
  console.log(time_now);
  var region_list = [];
  let region_ref = db_admin.collection("data").doc("allData");
  region_ref.listCollections().then(collections => {
    collections.forEach(collection => {
      region_list.push(collection.id);
    })
    region_list.forEach(function(element){
      region_ref.collection(element).orderBy("good_num", "desc").get()
        .then((snap) => {
          var i = 0;
          snap.forEach((doc) => {
            var data = doc.data();
              var user_ref = db_admin.collection("user").doc(data.id_uid);
              
              //user가 없는 경우??;; -> 오류남 -> 따라서 쿼리사용
              if(i == 0){
                user_ref.get()
                  .then((usersnap) => {
                    if(usersnap.exists){
                      var user_data = usersnap.data();
                      var cur_point = Number(user_data.id_point);
                      var new_point = String(cur_point + 10000);
                      console.log(cur_point, new_point, user_data.id_uid);
                      user_ref.update({
                        id_point: new_point
                      });
                      user_ref.collection("pointHistory").doc().set({
                        day: time,
                        point: "+10000",
                        type: "1등 포인트 지급"
                      })
                      console.log("1등 포인트 지급");
                    }
                    else{
                      console.log("탈퇴한 회원입니다.");
                    }
                  })
                  .catch((err) => {
                    console.log(err, "사용자 X");
                  });
              }
              if(i == 1){
                user_ref.get()
                  .then((usersnap) => {
                    if(usersnap.exists){
                      var user_data = usersnap.data();
                      var cur_point = Number(user_data.id_point);
                      var new_point = String(cur_point + 5000);
                      console.log(cur_point, new_point, user_data.id_uid);
                      user_ref.update({
                        id_point: new_point
                      });
                      user_ref.collection("pointHistory").doc().set({
                        day: time,
                        point: "+5000",
                        type: "2등 포인트 지급"
                      })
                      console.log("2등 포인트 지급");
                    }
                    else{
                      console.log("탈퇴한 회원입니다.");
                    }
                  })
                  .catch((err) => {
                    console.log(err, "사용자 X");
                  });
              }
              if(i == 2){
                user_ref.get()
                  .then((usersnap) => {
                    if(usersnap.exists){
                      var user_data = usersnap.data();
                      var cur_point = Number(user_data.id_point);
                      var new_point = String(cur_point + 2000);
                      console.log(cur_point, new_point, user_data.id_uid);
                      user_ref.update({
                        id_point: new_point
                      });
                      user_ref.collection("pointHistory").doc().set({
                        day: time,
                        point: "+2000",
                        type: "3등 포인트 지급"
                      })
                      console.log("3등 포인트 지급");
                    }
                    else{
                      console.log("탈퇴한 회원입니다.");
                    }
                  })
                  .catch((err) => {
                    console.log(err, "사용자 X");
                  });
              }
            i++;
          })
        })
    });
  })
});




module.exports = app;
