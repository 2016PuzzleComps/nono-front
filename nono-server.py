import sys
import flask
from flask import request, make_response
import psycopg2
import json
import config1 as config
import hashlib
import time
import random
import math
import pickle
from mle import MLE
from validation import *

app = flask.Flask(__name__)

@app.route('/')
def get_index():
    resp = make_response(flask.render_template('index.html'))
    solver_id = request.cookies.get('solver_id')
    if not solver_id or solver_id not in solvers_table:
        solver_id = create_new_solver_id(request)
        resp.set_cookie('solver_id', solver_id)
        solvers_table[solver_id] = Solver()
    return resp

# delete a solver's solve history
@app.route('/solver_history', methods=['DELETE'])
def reset_solve_history():
    solver_id = request.cookies.get('solver_id')
    if not solver_id:
        response = {'success': False, 'message': 'No solver_id set!'}
    else: 
        del solvers_table[solver_id]
        response = {'success': True}
    return jsom.dumps(response)

# get ID of a puzzle with fewest or tied for fewest logs in DB
@app.route('/puzzle', methods=['GET'])
def get_puzzle_file():
    solver_id = request.cookies.get('solver_id')
    if not solver_id:
        response = {'success': False, 'message': 'No solver_id set!'}
    else:
        puzzle_id = get_appropriate_puzzle_id(solver_id)
        puzzle_file = get_puzzle_file_from_database(puzzle_id)
        response = {'success': True, 'puzzle_id': puzzle_id, 'puzzle_file': puzzle_file, 'stats': {'puzzle_score': get_puzzle_score(puzzle_id)}}
    return json.dumps(response)

# receive new solve log file from client
@app.route('/log', methods=['POST'])
def post_log_file():
    try:
        request_json = json.loads(flask.request.data.decode('utf-8'))
        status = request_json['status']
        log_file = request_json['log_file'].strip()
        puzzle_id = request_json['puzzle_id']
        puzzle_file = get_puzzle_file_from_database(puzzle_id)
        # see if the log is valid in light of whether or not they purport to have solved it
        if solve_log_is_valid(puzzle_file, log_file, status):
            solver_id = request.cookies.get('solver_id')
            if not solver_id:
                response = {'success': False, 'message': 'No solver_id set!'}
            else:
                stats = update_solvers_table(solver_id, puzzle_id, log_file, status)
                response = {'success': True, 'stats': {'log_score': get_log_score(log_file), 'solver_score': solvers_table[solver_id].get_solver_score()}}
        else:
            response = {'success': False, 'message': "Invalid solve log! What are you up to..."}
    except json.decoder.JSONDecodeError as e:
        response = {'success': False, 'message': "Invalid JSON! What are you up to..."}
    # send response
    return json.dumps(response)

### DATA ###

# dictionary that stores info about each solver
solvers_table = {}

# ideal score
ideal_score = 500
max_score = 1000 # TODO: fine-tune this
norm_spread = 5 # TODO: fine-tune this
#mle = MLE(max_score, norm_spread)

# correlation coefficients
wwf_coef = 6.51
wwf2_coef = -0.01
puzzle_score_offset = 221.89
time_taken_coef = .5
num_moves_coef = 6

# object to store info about a solver
class Solver:
    def __init__(self):
        self.true_skill = ideal_score
        self.puzzle_scores = []
        self.solve_scores = []
        self.completed_puzzles = set()
    def update(self, puzzle_id, puzzle_score, solve_score):
        self.completed_puzzles.add(puzzle_id)
        self.puzzle_scores.append(puzzle_score)
        self.solve_scores.append(solve_score)
        self.true_skill = mle.get_new_true_skill(self.true_skill, self.solve_scores, self.puzzle_scores)
    def get_solver_score(self):
        return self.true_skill

### HELPER FUNCTIONS ###

# create a new cookie value to remember the solver by
def create_new_solver_id(request):
    food = str(request.user_agent) + str(time.time())
    m = hashlib.md5()
    m.update(food.encode('UTF-8'))
    return m.hexdigest()

# update the score of a solver after they've solved a puzzle
def update_solvers_table(solver_id, puzzle_id, log_file, status):
    solver = solvers_table[solver_id]
    puzzle_score = get_puzzle_score(puzzle_id)
    log_score = get_log_score(log_file)
    print("puzzle id: " + str(puzzle_id))
    print("puzzle score: " + str(puzzle_score))
    print("log score: " + str(log_score))
    solver.update(puzzle_id, puzzle_score, log_score)

# gets id of a good next puzzle for a solver based on their solver score
def get_appropriate_puzzle_id(solver_id):
    solver = solvers_table[solver_id]
    target_puzzle_score = solver.get_solver_score()
    query = ("SELECT puzzle_id FROM nono_puzzles ORDER BY ABS(((6.51*difficulty) - (0.01*(difficulty^2)) + 221.89) - %s) LIMIT 500;", (target_puzzle_score,))
    rows = select_from_database(query)
    # makes sure user doesn't receive already solved puzzle
    i=0
    while rows[i][0] in solver.completed_puzzles:
        print("skipping...")
        i = i+1
    return rows[i][0]

def get_puzzle_score(puzzle_id):
    query = ("SELECT difficulty FROM nono_puzzles WHERE puzzle_id = %s;", (puzzle_id,))
    rows = select_from_database(query)
    difficulty = int(rows[0][0])
    return (wwf_coef * difficulty) + (wwf2_coef * difficulty * difficulty) + puzzle_score_offset

def get_log_score(log_file):
    moves = log_file.split('\n')
    num_moves = len(moves)
    first_move = moves[0]
    last_move = moves[-1]
    time_taken = (int(last_move.split(' ')[0]) - int(first_move.split(' ')[0]))/1000
    return (time_taken_coef * time_taken) + (num_moves_coef * num_moves)

# load puzzle file from db given its ID
def get_puzzle_file_from_database(puzzle_id):
    query = ("SELECT puzzle_file FROM nono_puzzles WHERE puzzle_id = %s;", (puzzle_id,))
    rows = select_from_database(query)
    puzzle_file = rows[0][0]
    return puzzle_file

def select_from_database(query):
    try:
        # print("QUERY: " + str(query))
        connection = psycopg2.connect(user=config.username, password=config.password)
        cursor = connection.cursor()
        cursor.execute(query[0], query[1])
        rows = cursor.fetchall()
        # print("ROWS: " + str(rows))
        connection.close()
        return rows
    except Exception as e:
        print(e)
        exit(1)

if __name__ == '__main__':
    try:
        connection = psycopg2.connect(user=config.username, password=config.password)
        cursor = connection.cursor()
    except Exception as e:
        print(e)
        exit(1)
    host = sys.argv[1]
    port = int(sys.argv[2])
    # restore solvers_table from pickled file
    solvers_table_file = open("solvers_table.pickle", "w+")
    try:
        pickle.load(solvers_table, solvers_table_file)
    except:
        pass
    
    # run the app, when you stop it, save solvers_table
    try:
        app.run(host=host, port=port, threaded=True)
    except KeyboardInterrupt:
        pickle.dump(solvers_table, solvers_table_file)
        connection.close()
