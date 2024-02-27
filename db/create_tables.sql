create table channels (
    id INTEGER PRIMARY KEY,
    name VARCHAR(40) UNIQUE
);

-- (replies to : id) means that the message is a reply to another message
create table messages (
  id INTEGER PRIMARY KEY,
  replies_to INTEGER,
  user_id INTEGER,
  channel_id INTEGER,
  body TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id)
  FOREIGN KEY(replies_to) REFERENCES messages(id)
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