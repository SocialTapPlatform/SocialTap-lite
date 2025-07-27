(function(){
  var BASE = 'https://www.socialtap.social';
  // Views
  var loginV = document.getElementById('loginView'),
      chatV  = document.getElementById('chatView');
  // Login elements
  var emailI = document.getElementById('email'),
      passI  = document.getElementById('password'),
      loginE = document.getElementById('loginError'),
      loginB = document.getElementById('loginBtn');
  // Chat elements
  var chatList    = document.getElementById('chatList'),
      chatTitle   = document.getElementById('chatTitle'),
      msgC        = document.getElementById('msgContainer'),
      msgI        = document.getElementById('msgInput'),
      sendB       = document.getElementById('sendBtn'),
      logoutB     = document.getElementById('logoutBtn'),
      newChatB    = document.getElementById('newChatBtn');
  // State
  var chats = [], activeChat = null, pollChats, pollMsgs;

  // ------- Helpers -------
  function xhr(method, url, data, cb){
    var r=new XMLHttpRequest();
    r.open(method, url, true);
    r.withCredentials = true;
    if(data && typeof data === 'object'){
      r.setRequestHeader('Content-Type','application/json');
      data = JSON.stringify(data);
    }
    r.onreadystatechange = function(){
      if(r.readyState===4){
        var j;
        try{ j = JSON.parse(r.responseText); }catch(e){ j=null; }
        cb(r.status, j);
      }
    };
    r.send(data||null);
  }
  function renderChats(){
    chatList.innerHTML='';
    // global
    var li = document.createElement('li');
    li.className='list-group-item'+(activeChat===0?' active':'');
    li.innerHTML = '<a href="#">🌐 Global</a>';
    li.onclick = function(){
      setActive(0);
    };
    chatList.appendChild(li);
    for(var i=0;i<chats.length;i++){
      var c=chats[i];
      li = document.createElement('li');
      li.className='list-group-item'+(c.id===activeChat?' active':'');
      li.innerHTML = '<a href="#">'+c.name+'</a> <button data-id="'+c.id+'" class="btn btn-sm btn-danger">×</button>';
      (function(cid,elem){
        elem.querySelector('a').onclick = function(e){
          e.preventDefault(); setActive(cid);
        };
        elem.querySelector('button').onclick = function(){
          if(confirm('Delete chat?')) xhr('DELETE', BASE+'/api/chats/delete/'+cid,null,function(s,j){
            if(s===200) loadChats();
            else alert(j.error||'Error');
          });
        };
      })(c.id,li);
      chatList.appendChild(li);
    }
  }
  function renderMsgs(msgs){
    msgC.innerHTML='';
    for(var i=0;i<msgs.length;i++){
      var m=msgs[i],
          wrap=document.createElement('div'),
          side = (m.username===window.username?'own':'other');
      wrap.className='bubble '+side;
      wrap.innerHTML =
        '<div class="msg">'+m.content+'</div>'+
        '<div class="meta">'+m.username+'</div>';
      msgC.appendChild(wrap);
    }
    msgC.scrollTop = msgC.scrollHeight;
  }

  function setActive(id){
    activeChat = id;
    chatTitle.textContent = (id===0?'Global': (chats.filter(function(c){return c.id===id})[0]||{}).name);
    renderChats();
    loadMsgs();
  }

  // ------- API Calls -------
  function login(){
    loginE.className='alert alert-danger d-none';
    xhr('POST', BASE+'/api/login', {
      email: emailI.value, password: passI.value
    }, function(st,j){
      if(st===200 && j.success){
        window.username = j.username;
        showChat();
      } else {
        loginE.textContent = j.error||'Login failed';
        loginE.className='alert alert-danger';
      }
    });
  }
  function logout(){
    clearInterval(pollChats);
    clearInterval(pollMsgs);
    xhr('POST', BASE+'/api/logout', null, function(){
      showLogin();
    });
  }
  function loadChats(){
    xhr('GET', BASE+'/api/chats',null,function(st,j){
      if(st===200){ chats=j; renderChats(); }
    });
  }
  function loadMsgs(){
    var url = BASE + (activeChat===0?'/messages':'/messages?chat_id='+activeChat);
    xhr('GET', url, null, function(st,j){
      if(st===200) renderMsgs(j);
    });
  }
  function sendMsg(){
    var txt = msgI.value.replace(/^\s+|\s+$/g,'');
    if(!txt) return;
    xhr('POST', BASE+'/send', { chat_id:activeChat, content:txt }, function(st,j){
      if(st===200 && j.success){
        msgI.value='';
        loadMsgs();
      } else alert(j.error||'Send failed');
    });
  }
  function createChat(){
    var uids = prompt('Comma-separated user IDs to chat with (e.g. "2" or "2,3"):');
    if(!uids) return;
    var name = prompt('Group name (leave blank for DM):');
    xhr('POST', BASE+'/api/chats/create',
        { user_ids:uids.split(',').map(Number), name:name||'' },
        function(st,j){
      if(st===200 && j.success) loadChats();
      else alert(j.error||'Error');
    });
  }

  // ------- View Switch -------
  function showLogin(){
    loginV.style.display='block';
    chatV.style.display='none';
    clearInterval(pollChats);
    clearInterval(pollMsgs);
  }
  function showChat(){
    loginV.style.display='none';
    chatV.style.display='block';
    loadChats();
    setActive(0);
    pollChats = setInterval(loadChats, 5000);
    pollMsgs  = setInterval(loadMsgs, 1000);
  }

  // ------- Events -------
  loginB.onclick    = login;
  logoutB.onclick   = logout;
  sendB.onclick     = sendMsg;
  newChatB.onclick  = createChat;
  msgI.onkeypress   = function(e){ if(e.keyCode===13) sendMsg(); };

  // init
  showLogin();
})();
