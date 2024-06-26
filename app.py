import string, random, sqlite3
from datetime import datetime
from flask import Flask, g, jsonify, request
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def validate_api_key_and_user(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        user_id = request.headers.get('X-User-ID')
        if not api_key or not user_id:
            return jsonify({'error': 'Missing API Key or User ID'}), 400
        
        confirm = query_db('SELECT * FROM users WHERE name = ? AND api_key = ?', [user_id, api_key], one=True)
        if not confirm:
            return jsonify({'error': 'Unauthorized'}), 401
        return func(*args, **kwargs)
    return decorated_function
    
def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        # this returns rows as dictionaries rather than tuples
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channel')
@app.route('/channel/<ch_id>')
def index(ch_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

@app.route('/api/signup', methods=['GET'])
def signup():
    user = new_user()
    if user:
        return jsonify({'name': user['name'], 'password': user['password'], 'api_key': user['api_key']})
    return jsonify({'error': 'Could not create user'}), 500

@app.route('/api/update_user', methods=['POST'])
@validate_api_key_and_user
def update_user():
    data = request.get_json()
    print(data)
    username = data.get('username')
    password = data.get('password')
    api_key = request.headers.get('X-API-Key')
    try:
        if username:
            query_db('UPDATE users SET name = ? WHERE api_key = ?', [username, api_key])
        if password:
            query_db('UPDATE users SET password = ? WHERE api_key = ?', [password, api_key])
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
    
@app.route('/api/update_channelname', methods=['POST'])
@validate_api_key_and_user
def update_channelname():
    data = request.get_json()
    ch_id = data.get('channel_id')
    name = data.get('name')
    if ch_id and name:
        query_db('UPDATE channels SET name = ? WHERE id = ?', [name, ch_id])
        return jsonify({f'message': 'Channel {ch_id}updated successfully'}), 200
    return jsonify({'error': 'Could not update channel'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username and password:
        user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
        if user:
            return jsonify({'id': user['id'], 'name': user['name'], 'api_key': user['api_key']}), 200
    return jsonify({'error': 'Invalid username or password'}), 401

#creates a new channel
@app.route('/api/newchannel', methods=['POST'])
@validate_api_key_and_user
def create_room():
    name = "Channel #" + ''.join(random.choices(string.digits, k=6))
    room = query_db('insert into channels (name) values (?) returning id, name', [name], one=True)            
    if room:
        print("channel:", room)
        return jsonify({'id': room['id'], 'name': room['name']})
    return jsonify({'error': 'Could not create channel'}), 500


#loads all channels
@app.route('/api/channels', methods=['GET'])
def get_channels():
    channels = query_db('select * from channels')
    if channels:
        channels_list = [dict(row) for row in channels]
        return jsonify(channels_list)
    return jsonify([])

@app.route('/api/channel_posts', methods=['GET'])
@validate_api_key_and_user
def get_channel_messages():
    ch_id = request.args.get('channel_id')
    posts = query_db('SELECT posts.*, COUNT(messages.id) AS message_count FROM posts LEFT JOIN messages ON posts.id = messages.post_id WHERE posts.channel_id = ? GROUP BY posts.id;', [ch_id], one=False)
    print(ch_id, posts)
    if posts:
        return jsonify([dict(p) for p in posts]), 200
    return jsonify([]), 404

@app.route('/api/channel_post_replies', methods=['GET'])
@validate_api_key_and_user
def get_post_replies():
    post_id = request.args.get('post_id')
    replies = query_db('select * from messages where post_id = ? ORDER BY id ASC', [post_id], one=False)
    if replies:
        return jsonify([dict(r) for r in replies]), 200
    return jsonify([]), 200

@app.route('/api/channel_post/<post_id>/newreply', methods=['POST'])
@validate_api_key_and_user
def create_reply(post_id):
    data = request.get_json()
    user_id = request.headers.get('X-User-ID')
    newReply = data.get('message')
    if newReply:
        reply = query_db('insert into messages (post_id, user_id, body) values (?, ?, ?) returning id, post_id, user_id, body', [post_id, user_id, newReply], one=True)
        if reply:
            return jsonify(dict(reply)), 200
    return jsonify({'error': 'Could not create reply'}), 500

@app.route('/api/channel/<ch_id>/newpost', methods=['POST'])
@validate_api_key_and_user
def create_post(ch_id):
    data = request.get_json()
    user_id = request.headers.get('X-User-ID')
    newPost = data.get('message')
    if newPost:
        post = query_db('insert into posts (channel_id, user_id, body) values (?, ?, ?) returning id, channel_id, user_id, body', [ch_id, user_id, newPost], one=True)
        if post:
            return jsonify(dict(post)), 200
    return jsonify({'error': 'Could not create post'}), 500

@app.route('/api/deletepost/<post_id>', methods=['DELETE'])
@validate_api_key_and_user
def delete_post(post_id):
    user_id = request.headers.get('X-User-ID')
    print("in delete post user_id:", user_id, "post_id:", post_id)
    post = query_db('SELECT * FROM posts WHERE id = ?', [post_id], one=True)
    if post:
        query_db('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE post_id = ?)', [post_id])
        query_db('DELETE FROM messages WHERE post_id = ?', [post_id])
        query_db('DELETE FROM post_reactions WHERE post_id = ?;', [post_id])
        query_db('DELETE FROM posts WHERE id = ?', [post_id])
        return jsonify({'message': 'Post deleted successfully'}), 200
    return jsonify({'error': 'Could not delete post'}), 500

@app.route('/api/add_reaction', methods=['POST'])
@validate_api_key_and_user
def add_reaction():
    data = request.get_json()
    user_id = request.headers.get('X-User-ID')
    type = data.get('type')
    id = data.get('id')
    # index is 0 for dislike 1 for like
    index = data.get('index')
    if type == 'post':
        reaction = query_db('insert into post_reactions (post_id, user_id, emoji) values (?, ?, ?)', [id, user_id, index], one=True)
        return jsonify({'message': 'Success'}), 200
    elif type == 'reply':
        reaction = query_db('insert into reactions (message_id, user_id, emoji) values (?, ?, ?)', [id, user_id, index], one=True)
        return jsonify({'message': 'Success'}), 200
    return jsonify({'error': 'Could not add reaction'}), 500

@app.route('/api/get_reactions', methods=['GET'])
@validate_api_key_and_user
def get_reactions():
    type = request.args.get('type')
    id = request.args.get('id')
    index = request.args.get('index')
    if type == 'post':
        reactions = query_db('select distinct user_id from post_reactions where post_id = ? and emoji = ?', [id, index], one=False)
        if reactions:
            user_ids = [r[0] for r in reactions]
            return jsonify(user_ids), 200
    elif type == 'reply':
        reactions = query_db('select distinct user_id from reactions where message_id = ? and emoji = ?', [id, index], one=False)
        if reactions:
            user_ids = [r[0] for r in reactions]
            return jsonify(user_ids), 200
    return jsonify([]), 200