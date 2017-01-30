import sys
import flask
import json
import hashlib
import time

app = flask.Flask(__name__)

@app.route('/')
def get_index():
    return flask.render_template('index.html')

# verify that a log file represents a valid solve
def solve_log_is_valid(solve_id, log_file, status):
    log_file = log_file.strip()
    return True

# receive new solve log file from client
@app.route('/log-file', methods=['POST'])
def post_log_file():
    try:
        request = json.loads(flask.request.data.decode('utf-8'))
        solve_id = request['solve_id']
        status = request['status']
        # solve_info = get_solve_info(solve_id)
        solve_info = (5, solve_id)
        # see if they send a valid solve_id
        if solve_info:
            log_file = request['log_file']
            puzzle_id, mturk_token = solve_info
            # see if the log is valid in light of whether or not they purport to have solved it
            if solve_log_is_valid(puzzle_id, log_file, status):
                if status == 1:
                    response = {'success': True, 'mturk_token': mturk_token}
                else:
                    response = {'success': True}
                # put log file in database
                # submit_log_file(solve_id, puzzle_id, log_file, status)
            else:
                response = {'success': False, 'message': "Invalid solve log! What are you up to..."}
        else:
            response = {'success': False, 'message': "Invalid solve_id! You sly dog..."}
    except json.decoder.JSONDecodeError:
        response = {'success': False, 'message': "Invalid JSON! What are you up to..."}
    # send response
    return json.dumps(response)

if __name__ == '__main__':
    host = sys.argv[1]
    port = int(sys.argv[2])
    app.run(host=host, port=port)
