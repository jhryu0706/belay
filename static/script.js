// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash.main");
const PROFILE = document.querySelector(".profile.main");
const LOGIN = document.querySelector(".login.main");
const CHAN = document.querySelector(".conversations.main");
const getIsvalid = () => localStorage.getItem('isvalid');
const getUsername = () => localStorage.getItem('username');
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
    console.log("not valid");
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
  console.log("updating username:", username);
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
    method: 'PUT',
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
    switch (redirect){
      case '/profile':
        navigateTo(PROFILE);
        break;
      case '/channel':
        navigateTo(CHAN);
        break;
      default:
        break;
  }}
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
      let Channeldiv = document.createElement('div');
      Channeldiv.classList.add('channel');
      Channeldiv.innerHTML = `<strong>[${channel.id}] ${channel.name}</strong>`;
      Channeldiv.addEventListener('click',()=>{
        sessionStorage.setItem('channelID',channel.id);
        sessionStorage.setItem('channelName',channel.name);
        console.log("loading channelID:",channel.id);
        history.pushState({page : `/channel/${channel.id}`}, "channel", `/channel/${channel.id}`);
        router();
      });
      clist.appendChild(Channeldiv);
    });}
  })
  .catch(error => console.error('Error:', error));
}

function getPosts(){
  let channelID = sessionStorage.getItem('channelID');
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
    } else {
      throw new Error('Error:', response.status);
    }
  })
  .then(data => {
    console.log("this is all posts", data);
    let messageList = document.querySelector('.postList');
    messageList.innerHTML = '';
    data.forEach(message => {
      let messagediv = document.createElement('message');
      let authorElement = document.createElement('author');
      let contentElement = document.createElement('content');
      authorElement.textContent = message.user_id;
      contentElement.textContent = message.body;
      messagediv.appendChild(authorElement);
      messagediv.appendChild(contentElement);
      messageList.appendChild(messagediv);
    });
  })
  .catch(error => console.error('Error:', error));
}

function getRoomInfo(){
  let channelName = sessionStorage.getItem('channelName');
  document.getElementById('conversationName').textContent = channelName;
}

function createPost(){
  let channelID = sessionStorage.getItem('channelID');
  let newPost = document.querySelector('.conversations.main textarea[name=post]').value;
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

function showedit(){
  document.querySelector('.editChannelName').classList.remove('hide');
  document.getElementById('conversationName').classList.add('hide');
  document.querySelector('.clicktoedit').classList.add('hide');
}

function editChannelName() {

}

window.onpopstate = (event) =>{
  if(event.state){
    router();
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  console.log("DOM loaded");
  history.pushState(null, 'Splash', '/');
  router();
  });