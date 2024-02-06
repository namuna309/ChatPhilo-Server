const config = require('./config');
const app = require('./config/app');
const { createServer } = require('http');
const setupSocket = require('./config/socket'); // Socket.IO 설정
const { connectDB } = require('./config/database'); // 데이터베이스 연결

// 데이터베이스 연결
connectDB().then(() => {
    // HTTP 서버 생성
    const server = createServer(app);

    // Socket.IO 설정
    setupSocket(server);

    // 서버 시작
    server.listen(config.port, () => {
        console.log(`서버가 http://localhost:${config.port}에서 실행 중입니다.`);
    });
}).catch(err => {
    console.error('데이터베이스 연결 실패:', err);
});

