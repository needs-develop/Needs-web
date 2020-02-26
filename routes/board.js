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


//router.get('/', function(req, res, next){
//    console.log("GET방식");
//    res.redirect("main");
//});
//
//router.post('/', function(req, res, next){
//    console.log("POST방식");
//    res.redirect("main");
//});

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

    var uid = firebase.auth().currentUser.uid;
    
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
                
                
                // user - write 컬렉션의 visitnum 수정
                var user_write_doc = db.collection('user').doc(uid).collection('write').doc(free_data.document_name);
                user_write_doc.update({visitnum: free_data.visit_num});
            }

        
            var userData;
            db.collection('user').doc(uid).get()
                .then((doc) => {
                    var data = doc.data();    
                    userData = {  // 로그인한 사용자의 별명 가져옴
                        id_nickName : data.id_nickName,
                        id_email : data.id_email
                    }
                });

            

            var reply = [];
            free_doc.collection("reply").orderBy("timeReply").get()
                .then((snapshot) => {
                    
                    snapshot.forEach((reply_doc) => {
                        var reply_data = reply_doc.data();
                        reply_data.data_doc = free_data.document_name;
                        reply.push(reply_data);
                    });
                    res.render('board/boardRead', {board: free_data, page: page, reply: reply, user: userData});
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
        var uid = firebase.auth().currentUser.uid;

        db.collection('user').doc(uid).get()
            .then((doc) => {
                var userData = doc.data();    
            
                var data = {    // 로그인한 사용자의 별명과 이메일 가져옴
                    id_nickName : userData.id_nickName,
                    id_email : userData.id_email
                }
            
                res.render('board/boardWrite', {row: data});
            });
    }
    
    else {      // update
        db.collection('freeData').doc(req.query.document_name).get()
            .then((doc) => {
                var freeData = doc.data();
                res.render('board/boardWrite', {row: freeData});
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    }
});


// 글 저장
router.post('/boardSave', function(req,res,next){
    var postData = req.body;
    var uid = firebase.auth().currentUser.uid;
    
    if (!postData.document_name) {  // new
        postData.day = moment().format('YYYY/MM/DD HH:mm:ss');
        postData.visit_num = 0;
        postData.good_num = 0;
        
        // freeData 컬렉션에 데이터 저장
        var doc = db.collection("freeData").doc();    // 문서 명을 자동으로 지정
        postData.document_name = doc.id;
        doc.set(postData);
        
        // user 컬렉션에 데이터 저장
        var user_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
        var userData = {
            content: postData.content,
            day: postData.day,
            documentName: postData.document_name,
            good: postData.good_num,
            id: postData.id_nickName,
            id_value: postData.id_email,
            title: postData.title,
            visitnum: postData.visit_num
        }
        user_doc.set(userData);
    } 
    else {            // update
        var free_doc = db.collection("freeData").doc(postData.document_name);
        free_doc.update(postData);
        
        var user_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
        user_doc.update({title: postData.title, content: postData.content});
    }
    
    res.redirect('boardRead?document_name=' + postData.document_name);
});


// 글 좋아요
router.post('/boardLike', function(req,res,next){   
    var postData = req.body;
    var board_doc = db.collection("freeData").doc(postData.document_name);   
    var board_like_doc = board_doc.collection("like").doc(postData.id_email + "like");
    var uid = firebase.auth().currentUser.uid;

    board_doc.get()
        .then((doc1) => {
            var board_data = doc1.data();
        
            board_like_doc.get().then((doc2) => {
                
                // 좋아요를 누른 적 없는 경우
                if(!doc2.exists) 
                {
                    // freeData의 good_num 증가
                    var good = board_data.good_num + 1;  
                    board_doc.update({good_num : good});
                
                    // freeData - like 하위 문서와 필드 생성
                    board_like_doc.set({goodBoolean: true});
                                     
                    
                    // user - like 컬렉션 생성
                    var user_like_doc = db.collection('user').doc(uid).collection('like').doc(postData.document_name);
                    var likeData = {
                        content: board_data.content,
                        day: board_data.day,
                        documentName: postData.document_name,
                        good: good,
                        title: board_data.title,
                        visitnum: board_data.visit_num
                    }
                    user_like_doc.set(likeData);            
                    
                    // user - write 컬렉션의 good 수정
                    var user_write_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
                    user_write_doc.update({good: good});
                }
                
                
                // 좋아요를 이미 누른 상태에서 또 누른 경우 (좋아요 해제)
                else
                {
                    // freeData - like 에서 문서 삭제
                    board_doc.collection("like").doc(postData.id_email + "like").delete();  
                    
                    // freeData 의 good_num 감소
                    var good = board_data.good_num - 1;  
                    board_doc.update({good_num : good}); 
                    
                    
                    // user - like 에서 문서 삭제
                    var user_like_doc = db.collection('user').doc(uid).collection('like').doc(postData.document_name).delete();       
                    
                    // user - write 컬렉션의 good 수정
                    var user_write_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
                    user_write_doc.update({good: good});
                }
                
                
                res.redirect('boardRead?document_name=' + postData.document_name + '&page=' + req.body.page);
           });   
      });  
});


// 글 삭제
router.get('/boardDelete', function(req,res,next){
    var getData = req.query;
    
    db.collection('freeData').doc(getData.document_name).delete();
    var uid = firebase.auth().currentUser.uid;
    db.collection('user').doc(uid).collection('write').doc(getData.title+getData.content).delete();
    
    res.redirect('boardList');
});





// 댓글 수정
router.get('/commentEdit', function(req,res,next){
    db.collection("freeData").doc(req.query.data_doc).collection("reply").doc(req.query.reply_doc).get() 
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
    var postData = req.body;
    
    var board_doc = db.collection("freeData").doc(postData.data_doc);
    var user_doc = db.collection("user").doc(postData.data_doc);
    
    if (!postData.reply_doc) {     // new
        
        // freeData 컬렉션에 데이터 추가 
        postData.timeReply = moment().format('YYYY/MM/DD HH:mm:ss');
        var free_reply_doc = board_doc.collection("reply").doc();    
        postData.reply_doc = free_reply_doc.id;
        free_reply_doc.set(postData);
        
        
        // user 컬렉션에 데이터 추가
        var uid = firebase.auth().currentUser.uid;
        var user_reply_doc = db.collection('user').doc(uid).collection('reply').doc(postData.reply_doc);
        var userData = {
            documentName: postData.data_doc,
            reply_doc: postData.reply_doc,
            content: postData.contentReply,
            day: postData.timeReply,
        }
        user_reply_doc.set(userData);
    } 
    
    else {      // update
        
        // freeData 컬렉션 데이터 수정 
        var free_reply_doc = board_doc.collection("reply").doc(postData.reply_doc);
        free_reply_doc.update(postData);
        
        // user 컬렉션 데이터 수정
        var uid = firebase.auth().currentUser.uid;
        var user_reply_doc = db.collection('user').doc(uid).collection('reply').doc(postData.reply_doc);
        user_reply_doc.update({content: postData.contentReply});    
    } 
    
    res.redirect('boardRead?document_name=' + postData.data_doc);
});


// 댓글 삭제
router.get('/commentDelete', function(req,res,next){
    var getData = req.query;
    
   // freeData 컬렉션에서 데이터 삭제
    db.collection("freeData").doc(getData.data_doc).collection("reply").doc(getData.reply_doc).delete();   
    
    // user 컬렉션에서 데이터 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection("user").doc(uid).collection('reply').doc(getData.reply_doc).delete();
    
    
    res.redirect('boardRead?document_name=' + getData.data_doc);
});

module.exports = router;
