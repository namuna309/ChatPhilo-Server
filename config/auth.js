const config = require('../config');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { getDB } = require('./database');

// LocalStrategy 설정
passport.use(new LocalStrategy(async (inputUsername, inputPassword, done) => {
    const db = getDB();
    try {
        let user = await db.collection('user').findOne({ username: inputUsername });
        if (!user) {
            return done(null, false, { message: '아이디 DB에 없음' });
        }
        if (await bcrypt.compare(inputPassword, user.password) && user.isVerified) {
            return done(null, user);
        }
        if (!user.isVerified) {
            return done(null, false, { message: '이메일 인증 안함' });
        }
        return done(null, false, { message: '비밀번호 불일치' });
    } catch (error) {
        return done(error);
    }
}));

// GoogleStrategy 설정
passport.use(new GoogleStrategy({
    clientID: config.google_client_id,
    clientSecret: config.google_secret_key,
    callbackURL: "http://localhost:8080/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const db = getDB();
    try {
        let user = await db.collection('user').findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } else {
            let newUser = await db.collection('user').insertOne({
                googleId: profile.id,
                username: profile.emails[0].value,
                isVerified: true // Google을 통한 로그인은 기본적으로 이메일 인증을 거쳤다고 가정
            });
            return done(null, newUser);
        }
    } catch (error) {
        console.log(err);
        return done(error);
    }
}));

// 사용자 세션 저장
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
});

// 사용자 세션 복원
passport.deserializeUser(async (user, done) => {
    const db = getDB();
    try {
        let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
        if (result && result.password) {
            delete result.password; // 비밀번호는 제외
        }
        done(null, result);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;