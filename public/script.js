const app = new Vue({
    el:'#app',
    data() {
        return {
            socket:null,
            timer:null,
            typingTimer:-1,
            typingMessage:null,
            currentlyTyping:[],
            myUsername:null,
            avatarNum:null,
            onlineUsers:[],
            inputMessage:null,
            allMessages:[]
        }
    },
    methods: {
        /// @notice checks if the user has entered a suitable username. If they haven't, they will be asked to type in another one
        getUsername: function(){
            this.myUsername = prompt('What is your username?');
            
            if(this.myUsername == null || this.myUsername == '' || this.myUsername.indexOf(' ') > -1){
                this.getUsername();
            }
        },
        
        /// @notice Tells a server if a client has started or stopped typing
        /// @dev Upon typing a message, will tell server that a user is typing. 
        /// After 3 seconds since typing has stopped, the client will emit an event informing server they have stopped typing.
        iAmTyping: function(){
            // Only emit this client is typing once. If it's set to -1, it means the client has only just started typing
            if(this.typingTimer === -1){
                this.socket.emit('user-typing')
            }
            
            // Everytime the user types again, reset the counter to 0
            this.typingTimer = 0;
            clearInterval(this.timer)
            
            this.timer = setInterval(()=>{
                this.typingTimer = this.typingTimer + 1;
                if(this.typingTimer >= 3){
                    this.socket.emit('user-not-typing')
                    this.typingTimer = -1;
                    clearInterval(this.timer)
                } else {
                    this.typingTimer++;
                }
            },300)
        },
        
        formatTypingStatus: function(usersWhoAreTyping = []){
            const length = usersWhoAreTyping.length
            
            if(length <= 0) return null;
            if(length == 1) return usersWhoAreTyping[0].name;
            
            if(length > 1 && length < 5){      
                var typingMsg = "";
                
                usersWhoAreTyping.forEach((user,index)=>{
                    if(index == 0){
                        typingMsg += user.name
                    } else if(index == length - 1){
                        typingMsg += ' & ' + user.name
                    } else {
                        typingMsg += ', ' + user.name
                    }
                })
                
                return typingMsg;
            }
            
            if(length >= 5) return length + ' users are typing.';
        },
        
        /// @notice used to send a message
        /// @dev could be a public message, but also a private message
        sendMessage: function(){
            if(this.inputMessage.indexOf('/private') == 0 ){
                var privateType = this.inputMessage.split(' ')[0]
                var privateReciever = this.inputMessage.split(' ')[1]
                var privateMessage = this.inputMessage.split(privateType + ' ' + privateReciever + ' ')[1];
                console.log(privateMessage)
                if(privateReciever && privateMessage && privateReciever != this.myUsername){
                    this.socket.emit('private-chat-message',{
                        privateFrom: this.myUsername,
                        privateTo: privateReciever,
                        privateWhat: privateMessage,
                        avatar: this.avatarNum
                    });
                    
                }
                
            } else {
                if(this.inputMessage != ''){
                    this.socket.emit('chat-message',{
                        user: this.myUsername,
                        msg: this.inputMessage,
                        avatar: this.avatarNum
                    })
                }
            }
            this.inputMessage = null;
        },
        
        // not actually used
        /* sendPrivateMessage: function(user){
            this.inputMessage = '/private ' + user + ' ';
            document.getElementById('input').focus()
        }, */
        
        /// @notice Used to return the classes to be used for a message. Depends on whether a message is public, private, and who sent it
        styleMessage: function(item){
            if(item.user == this.myUsername && item.privateFromMe == true){
                return 'myMessage private';
            } else if(item.user == this.myUsername ){
                return 'myMessage';
            }else {
                if(item.private == true){
                    return 'privateMsg';
                } else {
                    return '';
                }
            }
        },
        
        /// @notice Used to nudge another user
        nudge: function(id){
            this.socket.emit('sendNudge',{
                nudgeUser: id
            })
            document.getElementById('sentNudge').play()
        },
        
        /// @notice Used to scroll the chat to the bottom upon update, specifically when a new message is received
        scrollToBottom: function(){
            var chat = document.getElementById('chat');
            if(chat.scrollTop > chat.scrollHeight - chat.clientHeight - 400){ 
                chat.scrollTop = chat.scrollHeight; 
            }
        }
    },
    beforeMount(){
        // Initializing the socket client
        this.socket = io()
    },
    
    mounted(){
        // used to select a random avatar number (1-5, inclusive).jpg to be used as avatar img
        this.avatarNum = Math.floor(Math.random() * 5 + 1);
        
        this.getUsername()
        // document.getElementById('input').focus(); 
        
        this.socket.on('connect',()=>{
            this.socket.emit('new-user', {
                name: this.myUsername,
                avatar: this.avatarNum
            })
            
            this.socket.on('new-user-online',(data)=>{
                this.onlineUsers = data
            })
            
            this.socket.on('users-typing',(data)=>{ 
                this.currentlyTyping = data;
                this.typingMessage = this.formatTypingStatus(this.currentlyTyping)            
            })
            
            this.socket.on('private-message-recieved',data=>{
                this.allMessages.push({
                    user: data.messageFrom,
                    msg: data.messageBody,
                    avatarMsg: data.avatar,
                    private: true
                })
            })
            
            this.socket.on('send-message-all',(data)=>{
                console.log(data)
                
                if(data.privateFromMe){
                    this.allMessages.push({
                        user: data.user,
                        msg: data.msg,
                        avatarMsg: data.avatar,
                        privateFromMe: data.privateFromMe,
                        messageTo: data.recipient
                    });
                }
                else {
                    this.allMessages.push({
                        user: data.user,
                        msg: data.msg,
                        avatarMsg: data.avatar
                    });
                }
            })
            
            this.socket.on('nudged',(data)=>{ 
                document.getElementById('nudge').play() // sound will play if someone has been nudged
                
                this.onlineUsers.forEach(user=>{
                    if(user.id == data.nudgeUserId){    
                        var id = user.name
                        document.getElementById(id).classList.add('nudge')
                        
                        setTimeout(()=>{
                            document.getElementById(id).classList.remove('nudge')
                        },1200)
                    }
                })
            })
            
        })
    },
    updated(){
        this.scrollToBottom()
    }
})