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



// 글 목록
router.get('/boardList', function(req, res, next) {
    var page = Number(req.query.page);
    var uid = firebase.auth().currentUser.uid;
    
    if (!page) {    // 그냥 boardList로 이동할 경우 1페이지를 보여줌
        page = 1;
    }
    
    db.collection('user').doc(uid).get()
        .then((doc) => {
            var id_region = doc.data().id_region;   // 지역 가져오기
            
            db.collection('freeData').orderBy("day", "desc").get()  // 날짜의 내림차순으로 글 가져오기
                .then((snapshot) => {
                    // 글이 있는 경우
                    if(snapshot.size != 0) {
                        var free_board = [];
                        snapshot.forEach((free_doc) => {
                            var free_data = free_doc.data();  // Key(문서이름)는 빼고 Data만 저장
                            free_board.push(free_data);    
                        });
                        res.render('freeboard/boardList', {board: free_board, page: page, id_region: id_region});
                    }
                    // 글이 없는 경우
                    else {
                        res.render('freeboard/boardList', {board: '', page: '', id_region: id_region});
                    }
                })
                .catch((err) => {
                    console.log('Error getting documents', err);
                });
        });
});


// 글 읽기
router.get('/boardRead', function(req, res, next) {
    var getData = req.query;
    var uid = firebase.auth().currentUser.uid;
    var free_doc = db.collection("freeData").doc(getData.document_name);   
    
    if(!getData.action) {   // 게시판으로부터 글을 읽는 경우
        free_doc.get()
            .then((doc) => {    
                var free_data = doc.data();    
                var page = getData.page;
    
                // boardList에서 글을 처음 읽을 때만 조회수 증가 (수정, 좋아요, 댓글 시에는 증가하지 않음)
                if(getData.visitNew == 1) {
                    // 실제 document의 visit_num를 1 증가
                    var visit = free_data.visit_num + 1;    
                    free_doc.update({visit_num : visit});   
    
                    // board로 넘겨줄 visit_num를 1 증가
                    free_data.visit_num += 1; 
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
                        res.render('freeboard/boardRead', {board: free_data, page: page, reply: reply, user: userData});
                    })
                    .catch((err) => {
                        console.log('Error getting documents', err);
                    });       
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    }
    else {  // 알림 페이지로부터 읽는 경우
        free_doc.get().then((doc) => {    
            if(doc.exists) {  // 해당 글이 있는 경우
                res.redirect('boardRead?document_name='+getData.document_name+'&visitNew=1')
            }
            else {  // 해당 글이 없는 경우
                res.send("<script>alert('삭제된 글입니다.');history.back();</script>")
            }
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });   
    }
});


// 글 쓰기
router.get('/boardWrite', function(req,res,next){
    if (!req.query.document_name) {   // new
        var uid = firebase.auth().currentUser.uid;

        db.collection('user').doc(uid).get()
            .then((doc) => {
                var userData = doc.data();    

                var data = { id_nickName : userData.id_nickName }

                res.render('freeboard/boardWrite', {row: data});
            });
    }

    else {      // update
        db.collection('freeData').doc(req.query.document_name).get()
            .then((doc) => {
                var freeData = doc.data();
                res.render('freeboard/boardWrite', {row: freeData});
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
        postData.id_uid = uid;
        doc.set(postData);

        // user 컬렉션에 데이터 저장
        var user_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
        var userData = { 
            data: "freedata",
            document_name: postData.document_name 
        }
        user_doc.set(userData);
    } 
    else {            // update
        var free_doc = db.collection("freeData").doc(postData.document_name);
        free_doc.update(postData);
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

                    // freeData - like
                    board_like_doc.set({goodBoolean: true, id_uid: uid});


                    // user - like
                    var user_like_doc = db.collection('user').doc(uid).collection('like').doc(postData.document_name);
                    var likeData = { 
                        data: "freedata", 
                        document_name: postData.document_name 
                    }
                    user_like_doc.set(likeData);     


                    // 자기 글이 아닐 경우 user(글쓴이) - action 생성
                    if(board_data.id_uid != uid) {  
                        var user_action_doc = db.collection('user').doc(board_data.id_uid).collection('action').doc();
                        var actionData = {
                            data: "data",
                            value: "freedata",
                            document_name: postData.document_name,
                            writer: postData.id_nickName,
                            day: moment().format('YYYY/MM/DD HH:mm:ss')
                        }
                        user_action_doc.set(actionData);
                    }
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
                }


                res.redirect('boardRead?document_name=' + postData.document_name + '&page=' + req.body.page);
           });   
      });  
});


// 글 삭제
router.get('/boardDelete', function(req,res,next){
    var getData = req.query;
    var board_doc = db.collection('freeData').doc(getData.document_name);


    // freeData - like 컬렉션 삭제
    db.collection('freeData').doc(getData.document_name).collection('like').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {      

                // user(좋아요한사람) - like 하위 문서 삭제
                var like_uid = doc.data().id_uid;
                db.collection('user').doc(like_uid).collection('like').doc(getData.document_name).delete();

                // freeData - like 컬렉션 하위 문서 삭제
                board_doc.collection('like').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });


    // freeData - reply 컬렉션 삭제
    db.collection('freeData').doc(getData.document_name).collection('reply').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {

                // user(댓글쓴사람) - reply 하위 문서 삭제
                var reply_uid = doc.data().id_uid;
                db.collection('user').doc(reply_uid).collection('reply').doc(doc.data().reply_doc).delete();

                // freeData - reply 컬렉션 하위 문서 삭제
                board_doc.collection('reply').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });


    // freeData의 문서 삭제
    db.collection('freeData').doc(getData.document_name).delete();


    // user - write의 문서 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection('user').doc(uid).collection('write').doc(getData.document_name).delete();


    res.redirect('boardList');
});







// 댓글 수정
router.get('/commentEdit', function(req,res,next){
    db.collection("freeData").doc(req.query.data_doc).collection("reply").doc(req.query.reply_doc).get()
        .then((doc) => {
            var childData = doc.data();
            res.render('freeboard/commentEdit', {reply: childData});
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

    var uid = firebase.auth().currentUser.uid;    
    var board_uid = postData.id_uid;    // 글쓴이의 uid
    delete postData.id_uid;


    if (!postData.reply_doc) {     // new

        // freeData - reply
        postData.timeReply = moment().format('YYYY/MM/DD HH:mm:ss');
        var free_reply_doc = board_doc.collection("reply").doc();    
        postData.reply_doc = free_reply_doc.id;
        postData.id_uid = uid;
        free_reply_doc.set(postData);


        // user - reply
        var uid = firebase.auth().currentUser.uid;
        var user_reply_doc = db.collection('user').doc(uid).collection('reply').doc(postData.reply_doc);
        var userData = { 
            data: "freedata",
            document_name: postData.data_doc, 
            reply_doc: postData.reply_doc    
        }
        user_reply_doc.set(userData);


        // 자기 글이 아닐 경우 user(글쓴이) - action 생성
        if(board_uid != uid) {
            var user_action_doc = db.collection('user').doc(board_uid).collection('action').doc();
            var actionData = {
                data: "data",
                value: "freedata",
                document_name: postData.data_doc,
                writer: postData.writerReply,
                day: postData.timeReply
            }
            user_action_doc.set(actionData); 
        } 

    } 

    else {    // update       
        // freeData 컬렉션 데이터 수정 
        var free_reply_doc = board_doc.collection("reply").doc(postData.reply_doc);
        free_reply_doc.update(postData);   
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
