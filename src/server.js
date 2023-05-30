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

  /// @notice When a new user connets
  socket.on('new-user',(data)=>{   
    allUsers.push({
      name: data.name,
      id: socket.id,
      avatar: data.avatar
    }) 
    
    io.emit('new-user-online', allUsers)
  })
  
  /// @notice When a user disconnects
  socket.on('disconnect',()=>{    
    allUsers = allUsers.filter(user=> user.id === socket.id)
    io.emit('new-user-online', allUsers)
    
    typing = typing.filter(user=> user.id === socket.id)
    io.emit('users-typing',typing)
  })
  
  /// @notice When a user types something into the chatbox, give participants a list of users who are currently typing
  socket.on('user-typing',()=>{
    var user = allUsers.find(user => user.id == socket.id)
    var isAlreadyTyping = typing.some(user => user.id == socket.id);
    
    // add typers who exist as users and are not already in the typing array
    if(user && isAlreadyTyping == false) {
      typing.push({
        id: socket.id,
        name: user.name
      })
    }

    io.emit('users-typing',typing) // TODO should this be here or inside the if statement?
  })
  
  /// @notice Emmited when a user hasn't typed after some time elapses
  socket.on('user-not-typing',()=>{
    typing = typing.filter(typer => typer.id !== socket.id)   
    io.emit('users-typing',typing)
  })
  
  /// @notice When a user sends a chat message, sent it to everyone else
  socket.on('chat-message',(data)=>{  
    io.emit('send-message-all',data)
  })
  
  /// @notice when a user sends someone a private chat message
  socket.on('private-chat-message',data=>{
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
          privateFromMe: true, //da bi editovali klasu te poruke, crvena sa desne strane // TODO what is this for?
          recipient: data.privateTo //may be useful to log the recipient of your pm
        })
      }
      
    }
  })
  
  /// @notice When a user nudges another user
  socket.on('sendNudge',(data)=>{
    io.to(data.nudgeUser).emit('nudged',{
      nudgerId: socket.id,
      nudgeUserId: data.nudgeUser
    })
  })
  
})


