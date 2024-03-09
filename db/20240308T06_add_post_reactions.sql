create table post_reactions ( 
    id INTEGER PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    emoji VARCHAR(40),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
)