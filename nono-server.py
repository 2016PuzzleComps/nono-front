import sys
import flask
import json
import hashlib
import time
from validation import *

app = flask.Flask(__name__)

@app.route('/')
def get_index():
    return flask.render_template('index.html')

if __name__ == '__main__':
    host = sys.argv[1]
    port = int(sys.argv[2])
    app.run(host=host, port=port)
