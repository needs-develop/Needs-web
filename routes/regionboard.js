var express = require('express');
var router = express.Router();
var firebase = require("firebase");
var dateFormat = require('dateformat');
var urlencode = require('urlencode');
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






router.get('/boardList', function(req, res, next) {
    var page = Number(req.query.page);
    var uid = firebase.auth().currentUser.uid;
    var board_region = req.query.board_region;
    var user_doc = db.collection('user').doc(uid);
    
    if (!page) {    // 그냥 boardList로 이동할 경우 1페이지를 보여줌
        page = 1;
    }
    
    user_doc.get()
        .then((doc) => {
            var id_region = doc.data().id_region;
            var id_email = doc.data().id_email;
            db.collection('data').doc('allData').collection(board_region).orderBy("day", "desc").get()  // 날짜의 내림차순으로 글 가져오기
                .then((snapshot) => {
                
                    user_doc.collection('favorites').orderBy("region").get()
                        .then((fav_snap) => {   // 즐겨찾기한 지역을 모두 가져옴
                        
                            var favorite_region = [];
                            var favorite = 0;
                            // 즐겨찾기한 지역이 있는 경우
                            if(fav_snap.size != 0) {                           
                                fav_snap.forEach((fav_doc) => {
                                    var fav_data = fav_doc.data();
                                    favorite_region.push(fav_data.region); 
                                });
                                
                                // board_region이 즐겨찾기 지역인 경우
                                if(favorite_region.includes(board_region)) {
                                    favorite = 1;
                                }    
                            }

                            
                        
                            // 글이 있는 경우
                            if(snapshot.size != 0) {
                                var region_board = [];
                                snapshot.forEach((region_doc) => {
                                    var region_data = region_doc.data();
                                    region_board.push(region_data);    
                                });
                                
                                res.render('regionboard/boardList', {board: region_board, page: page, id_email: id_email, id_region: id_region, board_region: board_region, favorite_region: favorite_region, favorite: favorite});
                            }
                            // 글이 없는 경우
                            else {
                                res.render('regionboard/boardList', {board: '', page: '', id_email: id_email, id_region: id_region, board_region: board_region, favorite_region: favorite_region, favorite: favorite});
                            }
                        
                        });
                
                    
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
    var board_region = getData.board_region;
    
    var region_doc = db.collection("data").doc('allData').collection(board_region).doc(getData.document_name);   

    if(!getData.action) {   // 게시판으로부터 글을 읽는 경우
        region_doc.get()
            .then((doc) => {    
                var region_data = doc.data();    
                var page = getData.page;
            
                // boardList에서 글을 처음 읽을 때만 조회수 증가 (수정, 좋아요, 댓글 시에는 증가하지 않음)
                if(getData.visitNew == '1') {
                    // 실제 document의 visit_num를 1 증가
                    var visit = region_data.visit_num + 1;    
                    region_doc.update({visit_num : visit});   
                    
                    // board로 넘겨줄 visit_num를 1 증가
                    region_data.visit_num += 1; 
                }
            
                var userData;
                db.collection('user').doc(uid).get()
                    .then((doc2) => {
                    var data = doc2.data();    
                    userData = { 
                        id_nickName : data.id_nickName,
                        id_email : data.id_email,
                        id_uid : data.id_uid
                    }
                    var id_region = data.id_region;
                    
                    
                    
                    var reply = [];
                    region_doc.collection("reply").orderBy("timeReply").get()
                        .then((snapshot) => {
                        snapshot.forEach((reply_doc) => {
                            var reply_data = reply_doc.data();
                            reply_data.data_doc = region_data.document_name;
                            reply.push(reply_data);
                        });
                        
                        
                        // 좋아요한 글인지 확인
                        region_doc.collection('like').doc(userData.id_email+'like').get()
                            .then((doc3) => {
                                var like;
                                if(doc3.exists) {
                                    like = 1;
                                } 

                                res.render('regionboard/boardRead', {board: region_data, page: page, reply: reply, user: userData, like: like, id_region: id_region, board_region: board_region});
                            }); 
                    });
                });
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    }
    else {  // 알림 페이지로부터 읽는 경우
        region_doc.get().then((doc) => {    
            if(doc.exists) {  // 해당 글이 있는 경우
                res.redirect('boardRead?document_name='+getData.document_name+'&visitNew=1&board_region=' + board_region);
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
    var getData = req.query;
    var board_region = getData.board_region;
    var uid = firebase.auth().currentUser.uid;

    if (!getData.document_name) {   // new
        db.collection('user').doc(uid).get()
            .then((doc) => {
                var data = doc.data();    
            
                var userData = {
                    id_nickName : data.id_nickName
                }
                var id_region = data.id_region;
            
                res.render('regionboard/boardWrite', {row: userData, page: 1, id_region: id_region, board_region: board_region});
            });
    }
    
    else {      // update
        db.collection('data').doc('allData').collection(board_region).doc(getData.document_name).get()
            .then((doc) => {
                var regionData = doc.data();
            
                db.collection('user').doc(uid).get()
                    .then((doc2) => {
                        var id_region = doc2.data().id_region;
                     
                        res.render('regionboard/boardWrite', {row: regionData, page: getData.page, id_region: id_region, board_region: board_region});
                    });
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
    var board_region = postData.board_region;
    var page = postData.page;
    delete postData.board_region;
    delete postData.page;
    
    var user_doc = db.collection('user').doc(uid); 
    
    if (!postData.document_name) {  // new
        user_doc.get().then((doc) => {
            var num_id_point = Number(doc.data().id_point);
        
            // 유저 포인트가 0~1이면 글 쓰기 불가
            if(num_id_point < 2) 
            {
                res.send("<script>alert('포인트가 부족해 글을 쓸 수 없습니다.');history.back();</script>");
            }
            else 
            { 
                postData.day = moment().format('YYYY/MM/DD HH:mm:ss');
                postData.visit_num = 0;
                postData.good_num = 0;
                
                // data - board_region
                var data_doc = db.collection("data").doc('allData').collection(board_region).doc();
                postData.document_name = data_doc.id;
                postData.id_uid = uid;
                data_doc.set(postData);
                
                // user - write
                var user_write_doc = user_doc.collection('write').doc(postData.document_name);
                var writeData = { 
                    document_name: postData.document_name,
                    address: board_region,
                    data: 'data'
                }
                user_write_doc.set(writeData); 
                
                
                // 유저 2포인트 차감
                num_id_point -= 2;
                user_doc.update( {id_point: String(num_id_point)} );
                
                // user - pointHistory 생성
                var user_pointHistory_doc = user_doc.collection('pointHistory').doc();
                var pointData = {
                    day: postData.day,
                    point: "-2",
                    type: "사용"
                }
                user_pointHistory_doc.set(pointData);           
                
                
                res.redirect('boardRead?document_name=' + postData.document_name + '&page=' + postData.page + '&board_region=' + board_region);
            }
        });
    } 
    else {            // update
        var data_doc = db.collection("data").doc('allData').collection(board_region).doc(postData.document_name);
        data_doc.update(postData);
        
        res.redirect('boardRead?document_name=' + postData.document_name + '&page=' + postData.page + '&board_region=' + board_region);
    }
});


// 글 좋아요
router.post('/boardLike', function(req,res,next){   
    var postData = req.body;
    var board_region = postData.board_region;
    var uid = firebase.auth().currentUser.uid;
    
    var board_doc = db.collection("data").doc('allData').collection(board_region).doc(postData.document_name);   
    var board_like_doc = board_doc.collection("like").doc(postData.id_email + "like");   
    var user_doc = db.collection('user').doc(uid);
    
    
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
                
                    // data - board_region - like
                    board_like_doc.set({goodBoolean: true, id_uid: uid});
                                     
                    
                    // user - like
                    var user_like_doc = user_doc.collection('like').doc(postData.document_name);
                    var likeData = { 
                        address: board_region,
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
                            address: board_region,
                            writer: postData.id_nickName,
                            day: moment().format('YYYY/MM/DD HH:mm:ss')
                        }
                        user_action_doc.set(actionData);
                    }
                    
                    
                    // 좋아요를 누르면 1포인트 획득 (pointLimit이 0이 아닌 경우만)
                    user_doc.get()
                        .then((doc3) => {
                            var id_email = doc3.data().id_email;  // user의 이메일 가져오기

                            var user_pointDay_doc = user_doc.collection('pointDay').doc(id_email+'pointDay');
                            user_pointDay_doc.get()
                                .then((doc4) => {
                                    var pointLimit = doc4.data().pointLimit;

                                    if(pointLimit != "0") {
                                        // pointLimit이 1 감소
                                        var num_pointLimit = Number(pointLimit);
                                        num_pointLimit -= 1;
                                        user_pointDay_doc.update( {pointLimit: String(num_pointLimit)} );    

                                        // 유저 1포인트 획득
                                        var num_id_point = Number(doc3.data().id_point);
                                        num_id_point += 1;
                                        user_doc.update( {id_point: String(num_id_point)} );
                                        
                                        // user - pointHistory 생성
                                        var user_pointHistory_doc = user_doc.collection('pointHistory').doc();
                                        var pointData = {
                                            day: moment().format('YYYY/MM/DD HH:mm:ss'),
                                            point: "+1",
                                            type: "획득"
                                        }
                                        user_pointHistory_doc.set(pointData);
                                    } 
                                });  
                        });      
                } 
                
                // 좋아요를 이미 누른 상태에서 또 누른 경우 (좋아요 해제)
                else
                {
                    // data - board_region - like 에서 문서 삭제
                    board_doc.collection("like").doc(postData.id_email + "like").delete();  
                    
                    // data - board_region 문서의 good_num 감소
                    var good = board_data.good_num - 1;  
                    board_doc.update({good_num : good}); 
                    
                    
                    // user - like 에서 문서 삭제
                    var user_like_doc = db.collection('user').doc(uid).collection('like').doc(postData.document_name).delete();       
                    
                    
                    // 좋아요 해제하면 1포인트 차감
                    user_doc.get()
                        .then((doc3) => {
                            var id_email = doc3.data().id_email;  // user의 이메일 가져오기

                            var user_pointDay_doc = user_doc.collection('pointDay').doc(id_email+'pointDay');
                            user_pointDay_doc.get()
                                .then((doc4) => {
                                    var pointLimit = doc4.data().pointLimit;

                                    if(pointLimit != "0") {
                                        // pointLimit이 1 증가
                                        var num_pointLimit = Number(pointLimit);
                                        num_pointLimit += 1;
                                        user_pointDay_doc.update( {pointLimit: String(num_pointLimit)} );    

                                        // 유저 1포인트 차감
                                        var num_id_point = Number(doc3.data().id_point);
                                        num_id_point -= 1;
                                        user_doc.update( {id_point: String(num_id_point)} );
                                        
                                        // user - pointHistory 생성
                                        var user_pointHistory_doc = user_doc.collection('pointHistory').doc();
                                        var pointData = {
                                            day: moment().format('YYYY/MM/DD HH:mm:ss'),
                                            point: "-1",
                                            type: "취소"
                                        }
                                        user_pointHistory_doc.set(pointData);
                                    } 
                                });  
                        });   
                }
                
                
                res.redirect('boardRead?document_name=' + postData.document_name + '&page=' + req.body.page + '&board_region=' + board_region);
           });   
      });  
});


// 글 삭제
router.get('/boardDelete', function(req,res,next){
    var getData = req.query;
    var board_region = getData.board_region;
    
    var board_doc = db.collection("data").doc('allData').collection(board_region).doc(getData.document_name);
    
    

    // data - board_region - like 컬렉션 삭제
    board_doc.collection('like').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {      
                
                // user(좋아요한사람) - like 하위 문서 삭제
                var like_uid = doc.data().id_uid;
                db.collection('user').doc(like_uid).collection('like').doc(getData.document_name).delete();
                         
                // data - board_region - like 컬렉션 하위 문서 삭제
                board_doc.collection('like').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
    
    // data - board_region - reply 컬렉션 삭제
    board_doc.collection('reply').get()
        .then((snapshot) => {
            snapshot.forEach((doc) => {
                
                // user(댓글쓴사람) - reply 하위 문서 삭제
                var reply_uid = doc.data().id_uid;
                db.collection('user').doc(reply_uid).collection('reply').doc(doc.data().reply_doc).delete();
                 
                // data - board_region - reply 컬렉션 하위 문서 삭제
                board_doc.collection('reply').doc(doc.id).delete();
            });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
    
    // data - board_region 의 문서 삭제
    db.collection('data').doc('allData').collection(board_region).doc(getData.document_name).delete();
    
    
    // user - write의 문서 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection('user').doc(uid).collection('write').doc(getData.document_name).delete();
    
    
    res.redirect('boardList?board_region=' + board_region);
});







// 댓글 수정
router.get('/commentEdit', function(req,res,next){
    var getData = req.query;
    var board_region = getData.board_region;
    db.collection("data").doc('allData').collection(getData.board_region).doc(getData.data_doc).collection("reply").doc(getData.reply_doc).get()
        .then((doc) => {
            var childData = doc.data();
            res.render('regionboard/commentEdit', {reply: childData, page: getData.page, board_region: board_region});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
    
});


// 댓글 저장
router.post('/commentSave', function(req,res,next) {
    var postData = req.body;
    var board_region = postData.board_region;
    
    var board_doc = db.collection("data").doc('allData').collection(board_region).doc(postData.data_doc);
    var user_doc = db.collection("user").doc(postData.data_doc);
    
    var uid = firebase.auth().currentUser.uid;    
    var board_uid = postData.id_uid;    // 글쓴이의 uid
    var page = postData.page;
    delete postData.id_uid;
    delete postData.board_region;
    delete postData.page;
    
    if (!postData.reply_doc) {     // new
        
        // data - board_region - reply
        postData.timeReply = moment().format('YYYY/MM/DD HH:mm:ss');
        var region_reply_doc = board_doc.collection("reply").doc();    
        postData.reply_doc = region_reply_doc.id;
        postData.id_uid = uid;
        region_reply_doc.set(postData);

        
        // user - reply
        var uid = firebase.auth().currentUser.uid;
        var user_reply_doc = db.collection('user').doc(uid).collection('reply').doc(postData.reply_doc);
        var userData = { 
            address: board_region,
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
                address: board_region,
                writer: postData.writerReply,
                day: postData.timeReply
            }
            user_action_doc.set(actionData); 
        } 
        
    } 
    
    else {    // update       
        // data - board_region - reply 데이터 수정 
        var region_reply_doc = board_doc.collection("reply").doc(postData.reply_doc);
        region_reply_doc.update(postData);   
    } 
    
    res.redirect('boardRead?document_name=' + postData.data_doc + '&page=' + page + '&board_region=' + board_region);
});


// 댓글 삭제
router.get('/commentDelete', function(req,res,next){
    var getData = req.query;
    var board_region = getData.board_region;
    
   // data - board_region - reply 에서 데이터 삭제
    db.collection("data").doc('allData').collection(board_region).doc(getData.data_doc).collection("reply").doc(getData.reply_doc).delete();   
    
    // user 컬렉션에서 데이터 삭제
    var uid = firebase.auth().currentUser.uid;
    db.collection("user").doc(uid).collection('reply').doc(getData.reply_doc).delete();
    
    
    res.redirect('boardRead?document_name=' + getData.data_doc + '&page=' + getData.page + '&board_region=' + board_region);
});


// 지역 즐겨찾기
router.post('/favorites', function(req,res,next){   
    var postData = req.body;
    var uid = firebase.auth().currentUser.uid;
    var user_favorites_doc = db.collection("user").doc(uid).collection('favorites').doc(postData.id_email+postData.region);

    user_favorites_doc.get().then((doc) => {
        
        // 즐겨찾기한 지역이 아닌 경우
        if(!doc.exists) 
        {
            var board_region = postData.region;
            var regionData = { region: postData.region }
            user_favorites_doc.set(regionData);
            
            res.send("<script>alert('즐겨찾기 설정 되었습니다.');location.href=document.referrer;</script>");
        }
        
        // 즐겨찾기를 이미 한 상태에서 또 누른 경우 (즐겨찾기 해제)
        else
        {
            // user - favorites 에서 문서 삭제
            user_favorites_doc.delete();  
            
            res.send("<script>alert('즐겨찾기 해제 되었습니다.');location.href=document.referrer;</script>");
        }
   });         
});


// 지역게시판 검색기능
router.get('/search', function(req, res, next) {
	var page = Number(req.query.page);
	if (!page) {    // 그냥 boardList로 이동할 경우 1페이지를 보여줌
		page = 1;
	}
	var search_method = req.query.sfl;
	var search_content = urlencode.decode(req.query.stx);
    var board_region = req.query.board_region;
	console.log(search_method, search_content);
	var uid = firebase.auth().currentUser.uid;
    var user_doc = db.collection('user').doc(uid);
    
    user_doc.get()
        .then((doc) => {
            var id_region = doc.data().id_region;
            var id_email = doc.data().id_email;
        
            user_doc.collection('favorites').orderBy("region").get()
                .then((fav_snap) => {
                        
                    var favorite = [];
                    // 즐겨찾기한 지역이 있는 경우
                    if(fav_snap.size != 0) {                           
                        fav_snap.forEach((fav_doc) => {
                            var fav_data = fav_doc.data();
                            favorite.push(fav_data.region); 
                        });
                    }
                
                
                    if(search_method == "by_nickName"){ //작성자 닉네임으로 검색
                        db.collection("data").doc("allData").collection(board_region).where("id_nickName", "==", search_content).get()
                            .then((snap) => {
                                if(snap.empty){
                                    console.log("No matching documents");
                                }
                                var search_result = [];
                                snap.forEach(doc => {
                                    console.log(doc.data());
                                    search_result.push(doc.data());
                                });

                                res.render('regionboard/boardList', {board: search_result, page: page, id_email: id_email, id_region: id_region, board_region: board_region, favorite_region: favorite});
                            });
                    }   
                    else if(search_method == "by_title"){	//제목으로 검색
                        // 검색은 Prefix 기능만 구현되어 있음.
                        db.collection("data").doc("allData").collection(board_region).where("title", ">=", search_content)
                            .where("title", "<=", search_content+'\uf8ff').get()
                            .then((snap) => {
                                if(snap.empty){
                                    console.log("No matching documents")
                                }
                                var search_result = [];
                                snap.forEach(doc => {
                                    console.log(doc.data());
                                    search_result.push(doc.data());
                                });
                                
                                res.render('regionboard/boardList', {board: search_result, page: page, id_email: id_email, id_region: id_region, board_region: board_region, favorite_region: favorite});
                           });
                    }
             });
       });
})


module.exports = router;
