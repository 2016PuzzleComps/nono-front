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
    if log_file == '':
        return False
    # TODO: get actual puzzle file
    top = [[1], [1,1], [3], [4], [3]]
    left = [[1,1], [2], [3], [3], [3]]

    # TODO: get the matrix from the log file
    matrix = [
        [False, True, False, True, False],
        [False, False, False, True, True],
        [False, False, True, True, True],
        [False, False, True, True, True],
        [True, True, True, False, False]
    ]

    inBlock = False
    currentCount = 0
    currentBlock = 0
    width = 5

    # Check that all the left constraints are met
    for row in range(0,width):
        constraints = left[row]
        currentCount = 0
        currentBlock = 0
        inBlock = False
        for col in range(0,width):
            if matrix[row][col] == 1:
                if currentBlock > (len(constraints)-1):
                    return False
                # If we're in a block, keep adding to it
                if currentCount < constraints[currentBlock]:
                    currentCount += 1
                    # If we've gone past the length of the block, exit
                else:
                    return False
                inBlock = True
            else:
                # If we were looking for more blocks, but didn't
                # find any, exit
                if inBlock and (currentCount < constraints[currentBlock]):
                    return False
                # If we just finished a block, then update counters
                elif inBlock and currentCount == constraints[currentBlock]:
                    currentCount = 0
                    currentBlock += 1
                inBlock = False
        if currentBlock < len(constraints):
            # Check to see if the last block ended
            if (currentBlock+1) == len(constraints) and currentCount != constraints[currentBlock]:
                return False
    # Check that all the top constraints are met
    for col in range(0,width):
        constraints = top[col]
        currentCount = 0
        currentBlock = 0
        inBlock = False
        for row in range(0, width):
            if matrix[row][col] == 1:
                if currentBlock > (len(constraints)-1):
                    return False
                # If we're in a block, keep adding to it
                if currentCount < constraints[currentBlock]:
                    currentCount += 1
                # If we've gone past the length of the block, exit
                else:
                    return False
                inBlock = True
            else:
                # If we were looking for more blocks, but didn't
                # find any, exit
                if inBlock and (currentCount < constraints[currentBlock]):
                    return False
                # If we just finished a block, then update counters
                elif inBlock and (currentCount == constraints[currentBlock]):
                    currentCount = 0
                    currentBlock += 1
                inBlock = False
            matrix[row][col] = 0
        if currentBlock < len(constraints):
            # Check to see if the last block ended
            if currentBlock+1 == len(constraints) and (currentCount != constraints[currentBlock]):
                return False
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
