create table channels (
    id INTEGER PRIMARY KEY,
    name VARCHAR(40) UNIQUE
);

-- (replies to : id) means that the message is a reply to another message

create table posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  channel_id INTEGER,
  body TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id)
);

create table users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(40) UNIQUE,
  password VARCHAR(40),
  api_key VARCHAR(40) DEFAULT 'gooseberry'
);

create table reactions ( 
    id INTEGER PRIMARY KEY,
    message_id INTEGER,
    user_id INTEGER,
    emoji VARCHAR(40)
)