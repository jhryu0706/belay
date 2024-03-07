drop table if exists messages;
create table messages (
  id INTEGER PRIMARY KEY,
  post_id INTEGER,
  user_id INTEGER,
  body TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(post_id) REFERENCES posts(id)
);

