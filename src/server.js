var express = require('express');
const path = require('path')
var app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http)
var port = 3000;

app.use(express.static('public')) 

app.get('/',(_,res)=>{res.sendFile(path.join(__dirname,'public'))})
app.get('*',(_,res)=>{res.sendStatus(404)})

http.listen(port,function(){
  console.log('Server started at http://localhost:'+ port)
})

var allUsers = []; 
var typing = [];

io.on('connection',(socket)=>{  
  socket.on('new-user',(data)=>{   
    console.log('A new user joined - ' + data.name + ' ' + socket.id);
    allUsers.push({
      name: data.name,
      id: socket.id,
      avatar: data.avatar
    }) 
    
    io.emit('new-user-online', allUsers)
    console.log(this)
    
  })
  
  socket.on('disconnect',()=>{
    console.log('Someone has disconnected', socket.id)
    
    allUsers = allUsers.filter(user=> user.id === socket.id)
    io.emit('new-user-online', allUsers)
    
    typing = typing.filter(user=> user.id === socket.id)
    io.emit('users-typing',typing)
  })
  
  
  socket.on('user-typing',()=>{
    var isAlreadyTyping = typing.some(user => user.id == socket.id);
    var user = allUsers.find(user => user.id == socket.id)
    
    // If user with socketId exist, and they aren't already in the typing array, add them to typing array and emmit to clients
    if(user && isAlreadyTyping == false) {
      typing.push({
        id: socket.id,
        name: user.name
      })
      io.emit('users-typing',typing)
    }
  })
  
  socket.on('user-not-typing',()=>{
    typing = typing.filter(typer => typer.id !== socket.id)
    
    console.log('typing')
    console.log(typing)
    
    io.emit('users-typing',typing)
  })
  
  socket.on('chat-message',(data)=>{  
    console.log(data)
    io.emit('send-message-all',data)
  })
  
  socket.on('private-chat-message',data=>{
    console.log(data)
    for (let i = 0; i < allUsers.length; i++) {
      if(allUsers[i].name == data.privateTo){
        io.to(allUsers[i].id).emit('private-message-recieved',{
          messageFrom: data.privateFrom,
          messageBody: data.privateWhat,
          avatar: data.avatar
        })
        
        // posaljemo jos jednom poruku za sve da vide, ali samo posiljaocu koji je poslao privatnu poruku (tom socketu.)
        socket.emit('send-message-all',{ 
          user: data.privateFrom,
          msg: data.privateWhat,
          avatar: data.avatar,
          privateFromMe: true, //da bi editovali klasu te poruke, crvena sa desne strane
          recipient: data.privateTo //may be useful to log the recipient of your pm
        })
      }
      
    }
  })
  
  socket.on('sendNudge',(data)=>{
    var nudgerId = socket.id
    // console.log(data.nudgeUser)
    io.to(data.nudgeUser).emit('nudged',{
      nudgerId: nudgerId,
      nudgeUserId: data.nudgeUser
    })
  })
  
})


