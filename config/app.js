const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./auth');
const routes = require('./routes');
const config = require('../config');

const mongodb_clusterUrl = `mongodb+srv://${config.mongodb_username}:${config.mongodb_pw}@${config.mongodb_cluster}.fdqwv6g.mongodb.net/?retryWrites=true&w=majority`;

const app = express();

// CORS 설정
app.use(cors({
    origin: `${config.endpoint}`, // 클라이언트 주소
    credentials: true
}));

// Body parser 및 URL encoding 설정
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// 쿠키 파서
app.use(cookieParser(config.session_secret));

// 세션 설정
app.use(session({
    secret: config.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 세션 유지 시간
    store: MongoStore.create({
        mongoUrl: mongodb_clusterUrl,
        dbName: config.mongodb_db,
    })
}));

// Passport 초기화 및 세션 연결
app.use(passport.initialize());
app.use(passport.session());

// 라우트 설정
app.use(routes);

module.exports = app;