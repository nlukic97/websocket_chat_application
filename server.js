var express = require('express');
var app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http)
var port = 3000;

app.use(express.static('./public'))

http.listen(port,function(){
  console.log('Server started at port '+ port + '. Nodemon is running.')
})

var allUsers = []; 
var typing = [];

io.on('connection',(socket)=>{
  // console.log('Socket id: ---------' + socket.id)
  var clientId = socket.id;

  socket.on('new-user',(data)=>{
    var userExists = false; 
    for(var i = 0; i < allUsers.length; i++){
      if(allUsers[i].name == data.name){
        userExists = true; 
        socket.emit('username-taken',data.name)
      }
    }

    if(!userExists){ 
      console.log('A new user joined - ' + data.name);
      allUsers.push({
        name: data.name,
        status: data.status,
        id: clientId,
        avatar: data.avatar
      }) 

      // console.log(allUsers)
     io.emit('new-user-online', allUsers)
    }

    socket.on('disconnect',(socket)=>{
      console.log('Someone has disconnected', socket)
      for(var i = 0; i < allUsers.length; i++){
        if(allUsers[i].id == clientId){ 
          allUsers.splice(i,1) 
          io.emit('new-user-online', allUsers)
        }
      }
    })
  })

  
  socket.on('user-typing',(data)=>{
    var alreadyTyping = false;
    for(var i = 0; i < typing.length; i++){
      if(typing[i] == data.userTyping){
        alreadyTyping = true;
      }
    }
   
    if(alreadyTyping == false){  
      typing.push(data.userTyping)
    }
    console.log(typing)
    io.emit('users-typing',typing)
  })

  socket.on('user-not-typing',(data)=>{
    for(var i = 0; i < typing.length; i++){
      if(typing[i] == data.userNotTyping){
        typing.splice(i,1)
      }
    }

    console.log(typing);
    io.emit('users-typing',typing)
  })

  socket.on('chat-message',(data)=>{
    console.log(data)
    io.emit('send-message-all',data)
  })

  socket.on('nudge-send',(data)=>{

    var nudgerId = socket.id
    // console.log(data.nudgeUser)
    io.to(data.nudgeUser).emit('nudge-recieve',{
      nudgerId: nudgerId,
      nudgeUserId: data.nudgeUser
    })
  })

})


