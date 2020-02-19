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


router.get('/', function(req, res, next){
    console.log("GET방식");
    res.redirect("/board/boardList");
});

router.post('/', function(req, res, next){
    console.log("POST방식");
    res.redirect("/board/boardList");
});

// 글 목록
router.get('/boardList', function(req, res, next) {
    var page = Number(req.query.page);
    if (!page) {    // 그냥 boardList로 이동할 경우 1페이지를 보여줌
        page = 1;
    }
  
    db.collection('freeData').orderBy("day", "desc").get()  // 날짜의 내림차순으로 정렬
        .then((snapshot) => {
            var free_board = [];
            snapshot.forEach((free_doc) => {
                var free_data = free_doc.data();  // Key(문서이름)는 빼고 Data만 저장
                free_board.push(free_data);               
            });
            res.render('board/boardList', {board: free_board, page: page});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});


// 글 읽기
router.get('/boardRead', function(req, res, next) {
    var free_doc = db.collection("freeData").doc(req.query.document_name);   

    free_doc.get()
        .then((doc) => {    
            var free_data = doc.data();    
            var page = req.query.page;
           
            // boardList에서 글을 처음 읽을 때만 조회수 증가 (수정, 좋아요, 댓글 시에는 증가하지 않음)
            if(req.query.visitNew == 1) {
                // 실제 document의 visit_num를 1 증가
                var visit = free_data.visit_num + 1;    
                free_doc.update({visit_num : visit});  
                
                // board로 넘겨줄 visit_num를 1 증가
                free_data.visit_num += 1; 
            }


            var reply = [];
            free_doc.collection("reply").orderBy("timeReply").get()
                .then((snapshot) => {
                    
                    snapshot.forEach((reply_doc) => {
                        var reply_data = reply_doc.data();
                        reply_data.data_doc = free_data.document_name;
                        reply.push(reply_data);
                    });
                    res.render('board/boardRead', {board: free_data, page: page, reply: reply});
                })
                .catch((err) => {
                    console.log('Error getting documents', err);
                });
 
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});


// 글 쓰기
router.get('/boardWrite', function(req,res,next){
    if (!req.query.document_name) {   // new
        res.render('board/boardWrite', {row: ""});
    }
    
    else {      // update
        db.collection('freeData').doc(req.query.document_name).get()    // document_name에 해당하는 데이터만 가져옴
            .then((doc) => {
                var childData = doc.data();
                res.render('board/boardWrite', {row: childData});
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    }
});


// 글 저장
router.post('/boardSave', function(req,res,next){
    var postData = req.body;
    
    if (!postData.document_name) {  // new
        postData.day = moment().format('YYYY/MM/DD HH:mm:ss');
        postData.visit_num = 0;
        postData.good_num = 0;
        
        var doc = db.collection("freeData").doc();    // 문서 명을 자동으로 지정
        postData.document_name = doc.id;
        doc.set(postData);
    } 
    else {            // update
        var doc = db.collection("freeData").doc(postData.document_name);
        doc.update(postData);
    }
    
    res.redirect('boardRead?document_name=' + postData.document_name);
});


// 글 좋아요
router.post('/boardLike', function(req,res,next){   
    var board_doc = db.collection("freeData").doc(req.body.document_name);   
    
    board_doc.get()
        .then((doc) => {
            var board_data = doc.data();
        
            var good = board_data.good_num + 1;  
            board_doc.update({good_num : good});
        
            res.redirect('boardRead?document_name=' + req.body.document_name + '&page=' + req.body.page);  // get함수 밖으로 빼면 안됨!
    });  
});


// 글 삭제
router.get('/boardDelete', function(req,res,next){
    db.collection('freeData').doc(req.query.document_name).delete()   
    res.redirect('boardList');
});





// 댓글 수정
router.get('/commentEdit', function(req,res,next){
    db.collection("freeData").doc(req.query.data_doc).collection("reply").doc(req.query.reply_doc).get()    // reply_doc에 해당하는 댓글만 가져옴
        .then((doc) => {
            var childData = doc.data();
            res.render('board/commentEdit', {reply: childData});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
});


// 댓글 저장
router.post('/commentSave', function(req,res,next){
    var postData = req.body;    // new: 이름,내용,data_doc, update: 이름,내용,data_doc,reply_doc
    var board_doc = db.collection("freeData").doc(postData.data_doc);
    
    if (!postData.reply_doc) {     // new
        postData.timeReply = moment().format('YYYY/M/D H:m');
        var reply_doc = board_doc.collection("reply").doc();    
        postData.reply_doc = reply_doc.id;
        reply_doc.set(postData);
        
        res.redirect('boardRead?document_name=' + postData.data_doc);
    } 
    else {        // update
        var reply_doc = board_doc.collection("reply").doc(postData.reply_doc);
        reply_doc.update(postData);
        
        res.redirect('boardRead?document_name=' + postData.data_doc);
    } 
});


// 댓글 삭제
router.get('/commentDelete', function(req,res,next){
    var getData = req.query;
    
    db.collection("freeData").doc(getData.data_doc).collection("reply").doc(getData.reply_doc).delete()   
    res.redirect('boardRead?document_name=' + getData.data_doc);
});

module.exports = router;