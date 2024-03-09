// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash.main");
const PROFILE = document.querySelector(".profile.main");
const LOGIN = document.querySelector(".login.main");
const CHAN = document.querySelector(".conversations.main");
const getIsvalid = () => localStorage.getItem('isvalid');
const getUsername = () => localStorage.getItem('username');
localStorage.setItem('student', "jhryu");
const getCurrentPath = () => window.location.pathname;

const passwordField = document.querySelector(".profile.main input[name=password]");
const repeatPasswordField = document.querySelector(".profile.main input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile.main input[name=password]").value;
  const r = repeatPasswordField.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  return repeatPasswordMatches() ? repeatPasswordField.setCustomValidity('') : repeatPasswordField.setCustomValidity('Passwords must match');
}
passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

function router() {
  let path = getCurrentPath();
  console.log("path: ", path);
  let isvalid = getIsvalid();
  updateUsername();
  if (isvalid){
    //need to show welcome message and create channel
    console.log("isvalid");
  document.querySelector(".loggedIn").classList.remove("hide");
  document.querySelector(".createChannelButton").classList.remove("hide");
  document.querySelector(".signup").classList.add("hide");
  document.querySelector(".loggedOut").classList.add("hide");
}
  else{
  document.querySelector(".loggedOut").classList.remove("hide");
  document.querySelector(".signup").classList.remove("hide");
  document.querySelector(".createChannelButton").classList.add("hide");
  document.querySelector(".loggedIn").classList.add("hide");
  }
  if(path === '/'){
    navigateTo(SPLASH);
  }
  else if(path === '/login'){
    // only triggered after login complete and router is called again
    if(isvalid === 'true'){
      navigateTo(SPLASH);
    }
    else{
      navigateTo(LOGIN);
    }
  }
  else if(path === '/profile'){
    if(isvalid === 'true'){
      navigateTo(PROFILE);
    }
    else{
      sessionStorage.setItem('redirect','/profile');
      navigateTo(LOGIN);
    }
  }
  else if(path.startsWith('/channel')){
    console.log("channel path");
    if(isvalid === 'true'){
      navigateTo(CHAN);
    }
    else{
      sessionStorage.setItem('redirect',path);
      navigateTo(LOGIN);
    }
  }
  loadChannels();
}

function navigateTo(currpage) {
  console.log("navigating to:",currpage);
  SPLASH.classList.add("hide");
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  CHAN.classList.add("hide");
  currpage.classList.remove("hide");
  switch (currpage) {
    case SPLASH:
      history.pushState({page : "/"}, "Splash", "/");
      break;
    case PROFILE:
      history.pushState({page : "/profile"}, "Profile", "/profile");
      break;
    case LOGIN:
      history.pushState({page : "/login"}, "Login", "/login");
      break;
    case CHAN:
      let channelID = sessionStorage.getItem('channelID');
      console.log("navigating to channelID:",channelID);
      history.pushState({page : `/channel/${channelID}`}, "channel", `/channel/${channelID}`);
      getPosts();
      getRoomInfo();
      // set message polling interval later
    default:
      break;
    }}

function signup(){
  fetch('/api/signup',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);
    if (data) {
      localStorage.setItem('isvalid','true');
      localStorage.setItem('api_key',data.api_key);
      localStorage.setItem('username',data.name);
      router();
    }
  })
  .catch(error => console.error('Error:', error));
}

function updateUsername(){
  username = getUsername();
    if (username){
    document.querySelectorAll('.username').forEach(element=>{
      element.textContent = username;
    });}
  }

function update() {
  //val=0 for username, val=1 for password
  let newusername = document.querySelector('.profile.main input[name=username]').value;
  let newpassword = document.querySelector('.profile.main input[name=password]').value;
  fetch('/api/update_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({username: newusername, password: newpassword})
  })
  .then(response => {
    if (response.ok){ 
      localStorage.setItem('username',newusername);
      updateUsername();
    } 
    return response.json()})
  .then(data => {
    alert(data.message); // Notify the user
  })
  .catch(error => console.error('Error:', error));
}

function logout(){
  localStorage.clear();
  sessionStorage.clear();
  history.pushState(null, 'Splash', '/');
  router();
}

function postloginredirect(){
  let redirect = sessionStorage.getItem('redirect');
  sessionStorage.removeItem('redirect');
  if (redirect){
      if (redirect== '/profile'){
        navigateTo(PROFILE);}
      else if (redirect.startsWith('/channel')){
        navigateTo(CHAN);}
      else (navigateTo(SPLASH));
  }
  else{
    history.pushState(null, 'Splash', '/');
    router();
  };}

function login() {
  let form= document.querySelector('.alignedForm.login');
  let username = form.querySelector('input[name=username]').value;
  let password = form.querySelector('input[name=password]').value;
  console.log('username:',username);
  console.log('password:',password);
  if (username === '' || password === '') {
    document.querySelector('#loginfailmessage').classList.remove('hide');
    return;
  }
  fetch('/api/login',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: username, password: password})
  })
  .then(response => {
    if (response.status === 200) {
      return response.json(); // Parse JSON body only on successful response
    } else {
      // Handle non-successful responses, e.g., 401 Unauthorized
      return;
    }}
  )
  .then(data=> {
    if (data) {
      console.log('Login success:', data);
      localStorage.setItem('isvalid','true');
      localStorage.setItem('api_key',data.api_key);
      localStorage.setItem('username',data.name);
      postloginredirect();
    }
    else{
      console.log('Login failed');
      document.querySelector('#loginfailmessage').classList.remove('hide');
    }
  })
  .catch(error => console.error('Error:', error));
}

function createChannel() {
  fetch('/api/newchannel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    }
  })
  router();
}

function loadChannels(){
  fetch('/api/channels',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(data => {
    channelsData = data;
    console.log("this is loadchannels", channelsData);
    if (data.length > 0) {
    let clist = document.querySelector('.channelList');
    clist.innerHTML = '';
    data.forEach(channel => {
      let Channeldiv = document.createElement('li');
      Channeldiv.classList.add('channel');
      if (channel.id == sessionStorage.getItem('channelID')){
        Channeldiv.classList.add('selected');
      }
      Channeldiv.innerHTML = `<strong>[${channel.id}] ${channel.name}</strong>`;
      Channeldiv.addEventListener('click',()=>{
      console.log("channel selected:",channel.id);
      sessionStorage.setItem('active','post')
      document.querySelector('.channels').classList.remove('active')
      document.getElementById('conversations').classList.add('active')
      sessionStorage.setItem('channelID',channel.id);
      sessionStorage.setItem('channelName',channel.name);
      history.pushState({type: "channel", page : `/channel/${channel.name}`}, `/channel/${channel.name}`, `/channel/${channel.id}`);
      router();
      });
      clist.appendChild(Channeldiv);
    });}
  })
  .catch(error => console.error('Error:', error));
}



function getPosts(){
  console.log("in getPosts");
  let channelID = sessionStorage.getItem('channelID');
  let messageList = document.querySelector('.postList');
    messageList.innerHTML = '';
  fetch(`/api/channel_posts?channel_id=${channelID}`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    }
  })
  .then(response => {
    if (response.status == 200) {
      return response.json(); // Parse JSON body only on successful response
    } else if (response.status == 404) {
      return {};
    }
  })
  .then(data => {
    data.forEach(message => {
      console.log("message:",message);
      

      let messagediv = document.createElement('message');
      messagediv.addEventListener('click',()=>{
        
        sessionStorage.setItem('post_id',message.id);
      });

      let commandlinediv = document.createElement('commandline');
      let authorElement = document.createElement('author');
      let contentElement = document.createElement('content');
      let mid = message.id;
      authorElement.textContent = message.user_id;
      contentElement.textContent = message.body;
      messagediv.appendChild(authorElement);
      messagediv.appendChild(contentElement);
      let commentIcon = document.createElement('commentIcon');
      //get comment count and add later
      numComments = message.message_count;
      commentIcon.textContent = `comment ${numComments}`;
      commentIcon.addEventListener('click',()=>{
        document.getElementById('conversations').classList.remove('active')
        document.querySelector('.replies.main').classList.add('active')
        sessionStorage.setItem('active','replies')
        sessionStorage.setItem('post_id',mid);
        getReplies(mid, message.body);
      });
      deleteIcon = document.createElement('deleteIcon');
      deleteIcon.textContent = '[delete]';
      deleteIcon.addEventListener('click',()=>{
        deletePost(mid);
      });
      emojibox = createEmojibox('post', mid);
      commandlinediv.appendChild(emojibox);
      commandlinediv.appendChild(commentIcon);
      commandlinediv.appendChild(deleteIcon)
      messagediv.appendChild(commandlinediv);
      messageList.appendChild(messagediv);
    });
  })
  .catch(error => console.error('Error:', error));
}

function deletePost(post_id){
  fetch(`/api/deletepost/${post_id}`,{
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    }
  })
  .then(response => { 
    if (response.status == 200) {
      getPosts();
    }
  });
}

function createEmojibox(type, id) {
  let emojibox = document.createElement('div');
  emojibox.classList.add('emojibox');
  let emojis = ['👍','👎'];
  emojis.forEach((emoji,index) => {
    let emojiElement = document.createElement('span');
    emojiElement.textContent = emoji;
    emojiElement.id = id;
    emojiElement.classList.add('emoji');
    let emojiusersList = document.createElement('div');
    emojiusersList.classList.add('emojiusersList');
    emojiElement.appendChild(emojiusersList)
    getemojiusers(emojiusersList, type, id, index);
    emojiElement.addEventListener('click',()=>{
      //id is post id
      addemoji(type, id, index);
    });
    // emojiElement.addEventListener('mouseenter',()=>{
    //   emojiusersList.classList.remove('hide');
    // });
    // emojiElement.addEventListener('mouseleave',()=>{
    //   emojiusersList.classList.add('hide');
    // });
    emojibox.appendChild(emojiElement);
  });
  return emojibox;
}

function addemoji(type,id, index){
  fetch(`/api/add_reaction`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({type: type, id: id, index: index})
  })
  .then(response => {
    if (response.status == 200) {
      getPosts();
    }
  });
}


function getemojiusers(emojiusersList,type, id, index){
  console.log("in getemojiusers");
  emojiusersList.innerHTML = '';
  fetch(`/api/get_reactions?type=${type}&id=${id}&index=${index}`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    }
  })
  .then(response => {
    if (response.status == 200) {
      return response.json(); // Parse JSON body only on successful response
    } else if (response.status == 404) {
      return {};
    }})
  .then(data => {
    data.forEach(user => {
      console.log("emojiusersList: ", emojiusersList)
      emojiusersList.innerHTML += user + ' ';
    })}
  )
  .catch(error => console.error('Error:', error));
}
  

function getReplies(post_id, messagebody){
  console.log("in getReplies post_id:",post_id);
  const repliesSection = document.querySelector('.replies');
  //adjusting the style of the wrapper to fit the replies section
  const wrapper = document.querySelector('.wrapper');
  repliesSection.classList.remove('hide');
  wrapper.style.gridTemplateColumns = '1fr 2fr 1fr'; 
  document.getElementById('posttoreply').textContent = messagebody;
  //fetching the comments
  fetch(`/api/channel_post_replies?post_id=${post_id}`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    }
  })
  .then(response => {
    if (response.status == 200) {
      return response.json(); // Parse JSON body only on successful response
    } else if (response.status == 404) {
      return {};
    }
  })
  .then(data => {
    const replyList = document.querySelector('.replyList');
    replyList.innerHTML = '';
    data.forEach(reply => {
      let commandlinediv = document.createElement('commandline');
      const replyDiv = document.createElement('message');
      const authorElement = document.createElement('author');
      const contentElement = document.createElement('content');
      authorElement.textContent = reply.user_id;
      contentElement.textContent = reply.body;
      emojibox = createEmojibox('reply', reply.id);
      commandlinediv.appendChild(emojibox);
      replyDiv.appendChild(authorElement);
      replyDiv.appendChild(contentElement);
      replyDiv.appendChild(commandlinediv);
      replyList.appendChild(replyDiv);
    });
  })
}
function getRoomInfo(){
  let channelName = sessionStorage.getItem('channelName');
  document.getElementById('conversationName').textContent = channelName;
}

function createPost(){
  let channelID = sessionStorage.getItem('channelID');
  let newPost = document.querySelector('.conversations.main textarea[name=post]').value;
  document.querySelector('.conversations.main textarea[name=post]').value = "";
  if (newPost == "") {
    return;
  }
  fetch(`/api/channel/${channelID}/newpost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({message: newPost})
  })
  .then(response => {
    if (response.status === 200) {
      return response.json(); // Parse JSON body only on successful response
    } else {
      throw new Error('Error:', response.status);
    }
  })
  .then(data => {
    console.log(data);
    getPosts();
  })
  .catch(error => console.error('Error:', error));
}

function createReply(){
  let newReply = document.querySelector('.replies textarea[name=reply]').value;
  let post_id = sessionStorage.getItem('post_id');
  console.log("in createReply post_id:",post_id);
  document.querySelector('.replies textarea[name=reply]').value = "";
  if (newReply == "") {
    return;
  }
  fetch(`/api/channel_post/${post_id}/newreply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({message: newReply})
  })
  .then(response => {
    if (response.status === 200) {
      return response.json(); // Parse JSON body only on successful response
    } else {
      throw new Error('Error:', response.status);
    }
  })
  .then(data => {
    console.log(data);
    getReplies(post_id);
    getPosts();
  })
  .catch(error => console.error('Error:', error));
}

function showedit(){
  document.querySelector('.editChannelName').classList.remove('hide');
  document.getElementById('conversationName').classList.add('hide');
  document.querySelector('.clicktoedit').classList.add('hide');
}


function editChannelName() {
  document.querySelector('.editChannelName').classList.add('hide');
  document.getElementById('conversationName').classList.remove('hide');
  document.querySelector('.clicktoedit').classList.remove('hide');
  let channelID = sessionStorage.getItem('channelID');
  let newChannelName = document.getElementById('channelNameInput').value;
  document.getElementById('channelNameInput').textContent = "";
  sessionStorage.setItem('channelName',newChannelName);
  if (newChannelName == "") {
    return;
  }
  fetch(`/api/update_channelname`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({
      name: newChannelName,
      channel_id: channelID})
  })
  .catch(error => {
    console.error('Error:', error);}
  )
    .finally(()=>{
      try {
        loadChannels();
        getRoomInfo();
        
      } catch (error) {
        console.error('Error:', error);
      }
    });
}

window.onpopstate = (event) =>{
  if(event.state){
    router();
  }
}

function backtoconversations() {
  document.querySelector('.replies.main').classList.add('hide')
  document.getElementById('conversations').classList.add('active')
  sessionStorage.setItem('active','post')
  document.getElementById('replies').classList.remove('active')
}

document.addEventListener('DOMContentLoaded',()=>{
  history.pushState(null, 'Splash', '/');
  document.querySelector('.channels').classList.add('active')
  sessionStorage.setItem('active','channels')
  router();
  });


function checkfornewmessage(){
  polling = setInterval(getPosts, 1000);
  polling = setInterval(getReplies, 1000);
}