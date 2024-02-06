const config = require('../config');
const express = require('express');
const router = express.Router();
const passport = require('../config/auth');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getDB } = require('../config/database');

// 로그인, 회원가입, 이메일 인증 등 인증 관련 라우트
// 로그인 요청
router.post('/login', async (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error);
        if (!user) {
            return res.redirect(`${config.endpoint}/login?state=is-invalid`);
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect(`${config.endpoint}/chat`);
        });
    })(req, res, next);
});

// 회원가입 이메일 중복 체크
router.post('/checkDuplicate', async (req, res) => {
    let inputUsername = req.query.username;
    const db = getDB();
    let result = await db.collection('user').findOne({ username: inputUsername });
    if (result || inputUsername.length === 0) {
        res.send(true);
    } else {
        res.send(false);
    }
});

// 회원가입을 위한 인증 링크 이메일 발송
router.post('/send-code', async (req, res) => {
    // 인증 코드 생성
    const authkey = crypto.randomBytes(20).toString('hex');
    const expires = new Date();
    expires.setHours(parseInt(expires.getHours()) + 24);

    // 발송 이메일 주소
    let to_address = req.body.username;



    // Transporter 설정
    let transporter = nodemailer.createTransport({
        service: config.mail_service, // 또는 host: 'smtp.gmail.com'; port: 587;
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: config.mail_auth_address, // 인증 Gmail 주소
            pass: config.mail_auth_pw // 인증 Gmail 비밀번호 or 앱 비밀번호
        }
    })

    // 메일 발송 옵션 설정
    let mailOptions = {
        from: 'nyah309dev@gmail.com',
        to: to_address,
        subject: '인증 링크 발송',
        html: `<p> <a href="http://localhost:${cofig.port}/register-verify/?username=${to_address}&token=${authkey}">Verify email</a></p>
        <p>이 링크를 클릭하여 ${expires.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        })} 까지 회원 가입 인증을 해주세요.</p>`
    };

    // 메일 발송
    transporter.sendMail(mailOptions, async (err, info) => {
        if (err) {
            res.status(500).send('회원가입 중 오류가 발생했습니다.');
        } else {
            console.log('Email sent: ' + info.response);

            // 비밀번호 해싱
            let hashed_pw = await bcrypt.hash(req.body.password, 10)

            // 회원 정보 db 추가
            await db.collection('user').insertOne({
                username: req.body.username,
                password: hashed_pw,
                token: authkey,
                expireDate: expires,
                isVerified: false,
            })
            res.redirect(`${config.endpoint}/main`);
        }
    });
});

// 회원가입 인증 링크 처리
router.get('/register-verify', async (req, res) => {
    let now = new Date();
    let result = await db.collection('user').findOne({ username: req.query.username });
    delete result.password;

    if (result && result.token == req.query.token && now <= result.expireDate) {
        let update_res = await db.collection('user').updateOne({ username: req.query.username }, { $set: { isVerified: true } });
        console.log('인증 성공');
        res.redirect(`${config.endpoint}`);
    } else {
        if (!result) res.send('유저 정보 없음');
        else if (result.token != req.query.token) res.send('토큰이 잘못됨');
        else {
            res.send('뭔가 잘못된듯');
        }
    }
});

// Google 로그인
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: `${config.endpoint}/login` }),
    function(req, res) {
        // 성공적인 인증 후 리다이렉트
        res.redirect(`${config.endpoint}/chat`);
});

// 회원가입 인증 링크 처리
router.get('/register-verify', async (req, res) => {
    let now = new Date();
    let result = await db.collection('user').findOne({ username: req.query.username });
    delete result.password;

    if (result && result.token == req.query.token && now <= result.expireDate) {
        let update_res = await db.collection('user').updateOne({ username: req.query.username }, { $set: { isVerified: true } });
        console.log('인증 성공');
        res.redirect(`${config.endpoint}`);
    } else {
        if (!result) res.send('유저 정보 없음');
        else if (result.token != req.query.token) res.send('토큰이 잘못됨');
        else {
            res.send('뭔가 잘못된듯');
        }
    }
});

// 세션 확인
router.get('/session', async (req, res) => {
    let user_data = req.user;
    console.log(req.user);
    if(!user_data) console.log('세션 만료');
    else console.log('id: ', user_data._id, 'username: ', user_data.username, ' => 로그인') 
    return res.send(user_data);
});

// 로그아웃
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        return res.status(200).send();
    });
});


module.exports = router;