const express = require('express');
const router = express.Router();
const { getDB } = require('./database');
const ObjectId = require('mongodb').ObjectId;
const config = require('../config');
const OpenAI  = require("openai"); 


const openai = new OpenAI({
    apiKey: config.openai_api_key,
    organization: config.openai_organization_id
  });

const { Server } = require('socket.io');

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // socket
    io.on('connection', (socket) => {
        console.log(`websocket 연결됨: ${socket.id}`);
        
        socket.on('ask-join', (room) => {
            socket.join(room);
            console.log(room, '과 join 되었습니다.')
        })

        socket.on('send_message', async (data) => {
            console.log('유저가 보낸거 : ', data.content)
            try {
                const db = getDB();

                // user가 보낸 메세지 DB에 저장
                let sendMessage = await db.collection('chatMessages').insertOne({
                    room_id: new ObjectId(data.room_id),
                    thread_id: data.thread_id,
                    type: data.type,
                    counselor: data.counselor,
                    content: data.content,
                    date: new Date(data.date),
                })
                console.log('user 메세지 저장됨', sendMessage);
                
                // open ai 메세지 생성
                let massages = await  openai.beta.threads.messages.create(
                    data.thread_id,
                    {
                        role:'user',
                        content: data.content
                    }
                )

                // 메시지 실행
                let run = await openai.beta.threads.runs.create(
                    data.thread_id,
                    { assistant_id: config.openai_assistant_id_schopenhauer }
                  );
                
                const maxAttempts = 20; // 최대 시도 횟수
                let attempts = 0;
                let is_completed = false;

                while(attempts < maxAttempts){ 
                    var runStatus = await openai.beta.threads.runs.retrieve(
                        data.thread_id,
                        run.id
                      );
                      
                    

                    if (runStatus.status === 'completed') {
                        console.log('메세지 발송 및 답변 생성 완료');
                        is_completed = true;
                        break
                    } else {
                        setTimeout(async() => {
                            console.log('상태 재확인')
                        }, 1000); 
                        
                        attempts++;
                    } 
                }
                
                if (is_completed){
                    massages = await openai.beta.threads.messages.list(
                        data.thread_id
                    );

                    // counselor가 보낸 메세지 DB에 저장
                    let counselorMessage = {
                        room_id: new ObjectId(data.room_id),
                        thread_id: data.thread_id,
                        type: 'counselor',
                        counselor: data.counselor,
                        content: massages.data[0].content[0].text.value,
                        date: new Date()
                    }
                    let replyMessage = await db.collection('chatMessages').insertOne(counselorMessage) 
                    console.log('counselor 메세지 저장됨', replyMessage);

                    // counselor 메세지 전송
                    io.to(data.room_id).emit(`braodcast-${data.room_id}`, counselorMessage);
                } else {
                    console.log('답변 생성 시간 초과');
                }
            }
            catch(err) {
                console.log(err)
                // counselor 메세지 전송
                io.to(data.room_id).emit(`braodcast-${data.room_id}`, err);
            }
        })
    })

    return io;
};


module.exports = setupSocket;