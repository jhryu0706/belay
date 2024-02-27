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

@app.route('/api/update_user', methods=['PUT'])
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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username and password:
        user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
        if user:
            return jsonify({'id': user['id'], 'name': user['name'], 'api_key': user['api_key']})
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/newchannel', methods=['POST'])
@validate_api_key_and_user
def create_room():
    name = "Channel #" + ''.join(random.choices(string.digits, k=6))
    room = query_db('insert into channels (name) values (?) returning id, name', [name], one=True)            
    if room:
        print("channel:", room)
        return jsonify({'id': room['id'], 'name': room['name']})
    return jsonify({'error': 'Could not create channel'}), 500


@app.route('/api/channels', methods=['GET'])
def get_channels():
    channels = query_db('select * from channels')
    if channels:
        channels_list = [dict(row) for row in channels]
        return jsonify(channels_list)
    return jsonify([])
