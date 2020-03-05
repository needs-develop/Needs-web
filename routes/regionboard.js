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





/* GET home page. */
router.get('/', function(req, res, next) {
    var uid = firebase.auth().currentUser.uid;
    var userData;
    db.collection('user').doc(uid).get()
        .then((doc) => {
            // 로그인한 사용자의 이메일 가져옴
            userData = {id_email : doc.data().id_email} 
        
            res.render('regionboard/regionboard', {user: userData});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});


router.get('/boardList', function(req, res, next) {
    var page = Number(req.query.page);
    if (!page) {    // 그냥 boardList로 이동할 경우 1페이지를 보여줌
        page = 1;
    }
  
    db.collection('data').doc('allData').collection('강남구청담동').orderBy("day", "desc").get()  // 날짜의 내림차순으로 정렬
        .then((snapshot) => {
            var region_board = [];
            snapshot.forEach((region_doc) => {
                var region_data = region_doc.data();
                region_board.push(region_data);    
            });
        
            res.render('regionboard/boardList', {board: region_board, page: page});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});


// 글 읽기
router.get('/boardRead', function(req, res, next) {
    var region_doc = db.collection("data").doc('allData').collection('강남구청담동').doc(req.query.document_name);   

    var uid = firebase.auth().currentUser.uid;

    region_doc.get()
        .then((doc) => {    
            var region_data = doc.data();    
            var page = req.query.page;
           
            // boardList에서 글을 처음 읽을 때만 조회수 증가 (수정, 좋아요, 댓글 시에는 증가하지 않음)
            if(req.query.visitNew == 1) {
                // 실제 document의 visit_num를 1 증가
                var visit = region_data.visit_num + 1;    
                region_doc.update({visit_num : visit});   
                
                // board로 넘겨줄 visit_num를 1 증가
                region_data.visit_num += 1; 
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
            region_doc.collection("reply").orderBy("timeReply").get()
                .then((snapshot) => {
                    
                    snapshot.forEach((reply_doc) => {
                        var reply_data = reply_doc.data();
                        reply_data.data_doc = region_data.document_name;
                        reply.push(reply_data);
                    });
                    res.render('regionboard/boardRead', {board: region_data, page: page, reply: reply, user: userData});
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
                    id_nickName : userData.id_nickName
                }
            
                res.render('regionboard/boardWrite', {row: data});
            });
    }
    
    else {      // update
        db.collection('data').doc('allData').collection('강남구청담동').doc(req.query.document_name).get()
            .then((doc) => {
                var regionData = doc.data();
                res.render('regionboard/boardWrite', {row: regionData});
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
        
        // data - 강남구xx동 컬렉션에 데이터 저장
        var doc = db.collection("data").doc('allData').collection('강남구청담동').doc();    // 문서 명을 자동으로 지정
        postData.document_name = doc.id;
        postData.id_uid = uid;
        doc.set(postData);
        
        // user 컬렉션에 데이터 저장
        var user_doc = db.collection('user').doc(uid).collection('write').doc(postData.document_name);
        var userData = { 
            document_name: postData.document_name,
            address: '강남구청담동',
            data: 'data'
        }
        user_doc.set(userData);
    } 
    else {            // update
        var free_doc = db.collection("data").doc('allData').collection('강남구청담동').doc(postData.document_name);
        free_doc.update(postData);
    }
    
    res.redirect('boardRead?document_name=' + postData.document_name);
});


// 글 좋아요
router.post('/boardLike', function(req,res,next){   
    var postData = req.body;
    var board_doc = db.collection("data").doc('allData').collection('강남구청담동').doc(postData.document_name);   
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
                
                    // data - 강남구xx동 - like
                    board_like_doc.set({goodBoolean: true, id_uid: uid});
                                     
                    
                    // user - like
                    var user_like_doc = db.collection('user').doc(uid).collection('like').doc(postData.document_name);
                    var likeData = { 
                        address: '강남구청담동',
                        data: "data", 
                        document_name: postData.document_name 
                    }
                    user_like_doc.set(likeData);     
                    
                    
                    // 자기 글이 아닐 경우 user(글쓴이) - action 생성
                    if(board_data.id_uid != uid) {  
                        var user_action_doc = db.collection('user').doc(board_data.id_uid).collection('action').doc();
                        var actionData = {
                            data: "data",
                            value: "data",
                            document_name: postData.document_name,
                            address: '강남구청담동',
                            writer: postData.id_nickName,
                            day: moment().format('YYYY/MM/DD HH:mm:ss')
                        }
                        user_action_doc.set(actionData);
                    }
                }
                
                
                // 좋아요를 이미 누른 상태에서 또 누른 경우 (좋아요 해제)
                else
                {
                    // data - 강남구xx동 - like 에서 문서 삭제
                    board_doc.collection("like").doc(postData.id_email + "like").delete();  
                    
                    // data - 강남구xx동 문서의 good_num 감소
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
    var board_doc = db.collection("data").doc('allData').collection('강남구청담동').doc(getData.document_name);
    

    // data - 강남구xx동 - like 컬렉션 삭제
    board_doc.collection('like').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {      
                
                // user(좋아요한사람) - like 하위 문서 삭제
                var like_uid = doc.data().id_uid;
                db.collection('user').doc(like_uid).collection('like').doc(getData.document_name).delete();
                         
                // data - 강남구xx동 - like 컬렉션 하위 문서 삭제
                board_doc.collection('like').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
    
    // data - 강남구xx동 - reply 컬렉션 삭제
    board_doc.collection('reply').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                
                // user(댓글쓴사람) - reply 하위 문서 삭제
                var reply_uid = doc.data().id_uid;
                db.collection('user').doc(reply_uid).collection('reply').doc(doc.data().reply_doc).delete();
                 
                // data - 강남구xx동 - reply 컬렉션 하위 문서 삭제
                board_doc.collection('reply').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
    
    // data - 강남구xx동 의 문서 삭제
    db.collection('data').doc('allData').collection('강남구청담동').doc(getData.document_name).delete();
    
    
    // user - write의 문서 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection('user').doc(uid).collection('write').doc(getData.document_name).delete();
    
    
    res.redirect('boardList');
});







// 댓글 수정
router.get('/commentEdit', function(req,res,next){
    db.collection("data").doc('allData').collection('강남구청담동').doc(req.query.data_doc).collection("reply").doc(req.query.reply_doc).get()
        .then((doc) => {
            var childData = doc.data();
            res.render('regionboard/commentEdit', {reply: childData});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
});


// 댓글 저장
router.post('/commentSave', function(req,res,next){
    var postData = req.body;
    var board_doc = db.collection("data").doc('allData').collection('강남구청담동').doc(postData.data_doc);
    var user_doc = db.collection("user").doc(postData.data_doc);
    
    var uid = firebase.auth().currentUser.uid;    
    var board_uid = postData.id_uid;    // 글쓴이의 uid
    delete postData.id_uid;
    
    
    if (!postData.reply_doc) {     // new
        
        // data - 강남구xx동 - reply
        postData.timeReply = moment().format('YYYY/MM/DD HH:mm:ss');
        var region_reply_doc = board_doc.collection("reply").doc();    
        postData.reply_doc = region_reply_doc.id;
        postData.id_uid = uid;
        region_reply_doc.set(postData);

        
        // user - reply
        var uid = firebase.auth().currentUser.uid;
        var user_reply_doc = db.collection('user').doc(uid).collection('reply').doc(postData.reply_doc);
        var userData = { 
            address: '강남구청담동',
            data: "data",
            document_name: postData.data_doc, 
            reply_doc: postData.reply_doc    
        }
        user_reply_doc.set(userData);

        
        // 자기 글이 아닐 경우 user(글쓴이) - action 생성
        if(board_uid != uid) {
            var user_action_doc = db.collection('user').doc(board_uid).collection('action').doc();
            var actionData = {
                data: "data",
                value: "data",
                document_name: postData.data_doc,
                address: '강남구청담동',
                writer: postData.writerReply,
                day: postData.timeReply
            }
            user_action_doc.set(actionData); 
        } 
        
    } 
    
    else {    // update       
        // data - 강남구xx동 - reply 데이터 수정 
        var region_reply_doc = board_doc.collection("reply").doc(postData.reply_doc);
        region_reply_doc.update(postData);   
    } 
    
    res.redirect('boardRead?document_name=' + postData.data_doc);
});


// 댓글 삭제
router.get('/commentDelete', function(req,res,next){
    var getData = req.query;
    
   // data - 강남구xx동 - reply 에서 데이터 삭제
    db.collection("data").doc('allData').collection('강남구청담동').doc(getData.data_doc).collection("reply").doc(getData.reply_doc).delete();   
    
    // user 컬렉션에서 데이터 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection("user").doc(uid).collection('reply').doc(getData.reply_doc).delete();
    
    
    res.redirect('boardRead?document_name=' + getData.data_doc);
});


// 지역 즐겨찾기
router.post('/myregion', function(req,res,next){   
    var postData = req.body;
    var uid = firebase.auth().currentUser.uid;
    
    var user_region_doc = db.collection("user").doc(uid).collection('myRegion').doc(postData.id_email+'myRegion');
    var regionData = {regionName: postData.regionName}
    user_region_doc.set(regionData);
    
    res.send("<script>alert('즐겨찾기 설정 되었습니다.');history.back();</script>");
                
    //res.redirect(history.back()); 
});






module.exports = router;