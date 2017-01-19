/* GLOBAL VARS */

var vehicleColor = '#306aad';
var vipColor = '#b54141';
var squareSize = 100;
var borderWidth = 30;
var borderColor = '#916f25';
var boardColor = '#e8d39b';

var board;
var initialBoard = "";
var log = "";
var moveList = [];
var currentMove;

var gameOver = false;
var buttonAdded = false;
var fiveMinutes = false;
var numMoves = 0;

var solveID;

// open the win tab
function openFinish(title, body) {
	document.getElementById("title").innerHTML = title;
	document.getElementById("body").innerHTML = body;
	document.getElementById("finish").style.height = "100%";
}

function waitToQuit() {
	setTimeout(function() { 
		fiveMinutes = true; 
	}, 300000);
}

function insertQuitButton() {
	var giveUpButton = document.createElement("giveUpButton");
	var text = document.createTextNode("Give Up");
	giveUpButton.appendChild(text);
	giveUpButton.className = "button";
	giveUpButton.classList.add("giveUpButton");
	buttonDiv = document.getElementById("buttonsDiv");
	buttonDiv.appendChild(giveUpButton);
	giveUpButton.onclick = giveUp;
	buttonAdded = true;
}

/* SERVER STUFF */

// receive puzzle from server
function getPuzzleFile() {
	var oReq = new XMLHttpRequest();
	oReq.addEventListener('load', function() {
		resp = JSON.parse(this.responseText);
		if(resp.success) {
			solveID = resp.solve_id;
			loadBoardFromText(resp.puzzle_file);
		} else {
			alert(resp.message);
		}
	});
	oReq.open("GET", "http://" + window.location.hostname + ":" + window.location.port + "/puzzle-file");
	oReq.send(null);
}

// submit solve log to server
function submitLog(completed) {
	var oReq = new XMLHttpRequest();
	// on successful response
	oReq.addEventListener('load', function() {
		var title;
		var body;
		if(this.status == 200) {
			var resp = JSON.parse(this.responseText);
			if(resp.success) {
				if(resp.mturk_token) {
					// if they solved it
					title = "Success! Here's your MTurk token: ";
					body = resp.mturk_token;
				} else {
					// if they gave up
					title = "Better luck next time!";
					body = "";
				}
			} else {
				// if they tried to cheat
				title = "Oops... ";
				body = resp.message;
			}
		} else {
			// if something went wrong on the server
			title = "Uh oh...";
			body = this.statusText;
		}
		openFinish(title, body);
	});
	// on connection error
	oReq.addEventListener('error', function() {
		console.log('error');
		openFinish("Uh oh...", "The server seems to be down. Try again later?");
	});
	oReq.open("POST", "http://" + window.location.hostname + ":" + window.location.port + "/log-file");
	var status;
	if(completed) {
		status = 1;
	} else {
		status = 2;
	}
	var msg = {
		solve_id: solveID,
		log_file: log,
		status: status
	};
	oReq.send(JSON.stringify(msg));
}

/* BUTTON STUFF */

document.getElementById('resetButton').onclick = resetBoard;
document.getElementById('undoButton').onclick = undoMove;

// Resets the board to the initial state (if there is one)
function resetBoard() {
	if(!gameOver && initialBoard != "") {
		loadBoardFromText(initialBoard);
		// clear most recent moves and log the board reset
		moveList = [];
		logMove("R");
	}
}

// undo the last move
function undoMove() {
	if(!gameOver && moveList.length > 0) {
		var lastMove = moveList.pop();
		var currentPos;
		// remove the vehicle from the prototype
		board.placeVehicle(lastMove.vehicle, false);
		if (lastMove.vehicle.horiz) {
			currentPos = lastMove.vehicle.x;
		} else {
			currentPos = lastMove.vehicle.y;
		}
		moveVehicleTo(lastMove.vehicle, currentPos + (lastMove.ipos - lastMove.fpos));
		logMove("U");
	}
}

// give up and submit partial log to server
function giveUp() {
	gameOver = true;
	submitLog(false);
}

/* CLASS DEFINITION STUFF */

function Board(width, height, exit_offset) {
	this.width = width;
	this.height = height;
	this.vehicles = [];
	this.exit_offset = exit_offset;
	// create 2d array of false
	this.occupied = [];
	for(var x = 0; x < this.width; x++) {
		this.occupied[x] = [];
		for(var y = 0; y < this.height; y++) {
			this.occupied[x][y] = false;
		}
	}
	// borders
	this.occupied[-1] = [];
	this.occupied[this.width] = [];
	for(var x = 0; x < this.width; x++) {
		this.occupied[x][-1] = true;
		this.occupied[x][this.height] = true;
	}
	for(var y = 0; y < this.height; y++) {
		this.occupied[-1][y] = true;
		this.occupied[this.width][y] = true;
	}
	// exit
	this.occupied[this.width][this.exit_offset] = false;
	var i = 1;
	for(; i <= 1; i++) { // for now just assume the vip car has size 2
		this.occupied[this.width+i] = [];
		this.occupied[this.width+i][this.exit_offset] = false;
	}
	this.occupied[this.width+i] = [];
	this.occupied[this.width+i][this.exit_offset] = true;
}
Board.prototype.addVehicle = function(v) {
	this.vehicles.push(v);
	this.placeVehicle(v, true);
}
Board.prototype.placeVehicle = function(v, down) {
	if(v.horiz) {
		for(var i = 0; i < v.size; i++) {
			this.occupied[v.x + i][v.y] = down;
		}
	} else {
		for(var i = 0; i < v.size; i++) {
			this.occupied[v.x][v.y + i] = down;
		}
	}
}

function Vehicle(isVip, horiz, size, x, y) {
	this.isVip = isVip;
	this.horiz = horiz;
	this.size = size;
	this.x = x;
	this.y = y;
}

function Move(vehicle, ipos, fpos) {
	this.vehicle = vehicle;
	this.ipos = ipos;
	this.fpos = fpos;
}

/* CANVAS STUFF */

var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

// draw a vehicle to the canvas
function drawVehicle(vehicle) {
	context.beginPath();
	if(vehicle.isVip) {
		context.fillStyle = vipColor;
	} else {
		context.fillStyle = vehicleColor;
	}
	if(vehicle.horiz) {
		context.rect((vehicle.x * squareSize) + borderWidth, (vehicle.y * squareSize) + borderWidth, vehicle.size * squareSize, squareSize);
	} else {
		context.rect((vehicle.x * squareSize) + borderWidth, (vehicle.y * squareSize) + borderWidth, squareSize, vehicle.size * squareSize);
	}
	context.fill();
	context.stroke();
}

// render a frame
function drawFrame() {
	// clear everything //
	context.clearRect(0, 0, canvas.width, canvas.height);
	// draw border //
	// brown border
	context.fillStyle = borderColor;
	context.fillRect(0, 0, (borderWidth * 2) + (board.width * squareSize), (borderWidth * 2) + (board.height * squareSize));
	// light brown inside
	context.fillStyle = boardColor;
	context.fillRect(borderWidth, borderWidth, board.width * squareSize + 2, board.height * squareSize);
	// exit is part of board //
	var clearX, clearY;
	var clearWidth = borderWidth + 1;
	var clearHeight = squareSize;
	clearX = borderWidth + (board.width * squareSize) - 1;
	clearY = borderWidth + (board.exit_offset * squareSize);
	context.fillRect(clearX, clearY, clearWidth, clearHeight);
	// draw lines around board
	context.beginPath();
	context.moveTo(0,0);
	context.lineTo(borderWidth * 2 + (board.width * squareSize), 0);
	context.lineTo(borderWidth * 2 + (board.width * squareSize), clearY);
	context.lineTo(clearX + 2, clearY);
	context.lineTo(clearX + 2, borderWidth);
	context.lineTo(borderWidth, borderWidth);
	context.lineTo(borderWidth, borderWidth + (board.height * squareSize));
	context.lineTo(clearX + 2, borderWidth + (board.height * squareSize));
	context.lineTo(clearX + 2, clearY + clearHeight);
	context.lineTo(clearX + clearWidth, clearY + clearHeight);
	context.lineTo(clearX + clearWidth, (board.height * squareSize) + (borderWidth * 2));
	context.lineTo(0, (board.height * squareSize) + (borderWidth * 2));
	context.closePath();
	context.stroke();
	// draw vehicles //
	for(i in board.vehicles) {
		drawVehicle(board.vehicles[i]);
	}
}

/* I DON'T THINK THERE'S A CATEGORY FOR THIS */

// Loads a board from a given block of text
function loadBoardFromText(text) {
	initialBoard = text;
	var lines = text.split("\n");
	var dimen = lines[0].split(" ");
	var exitOffset = parseInt(lines[1].split(" ")[1]);
	board = new Board(parseInt(dimen[0]), parseInt(dimen[1]), exitOffset);
	var isFirst = true;
	for (var i=1; i<lines.length; i++) {
		var items = lines[i].split(" ");
		if (items.length != 4) {
			break;
		}
		var newVehicle = new Vehicle(isFirst, items[3].charAt(0)=="T", parseInt(items[2]), parseInt(items[0]), parseInt(items[1]));
		board.addVehicle(newVehicle);
		if (isFirst) {
			isFirst = false;
		}
	}
	drawFrame();
}


/* LOGGING STUFF */

// saves a move to the movelist and log
function saveMove(selectedVehicleIndex, move) {
	var selectedVehicle = board.vehicles[selectedVehicleIndex];
	// save to the currentMove
	if(selectedVehicle.horiz) {
		currentMove.fpos = selectedVehicle.x;
	} else {
		currentMove.fpos = selectedVehicle.y;
	}
	if (currentMove.ipos != currentMove.fpos) {
		moveList.push(currentMove);
	}
	// if there was a move, record it in the recent moves
	// and in the log
	var logLine = selectedVehicleIndex + " ";
	if (currentMove.ipos != currentMove.fpos) {
		logLine += currentMove.fpos - currentMove.ipos;
	} else {
		return;
	}
	logMove(logLine);
}

// saves a move to the log with a timestamp
function logMove(moveString) {
	log += Date.now() + " " + moveString + "\n";
	numMoves++;
    if (!buttonAdded && numMoves > 50 && fiveMinutes) {
		insertQuitButton();
	}
}

/* MOUSE/TOUCH EVENT STUFF */

var fingerDown = false; // whether a finger is touching the screen or not
var selectedVehicleIndex = null; // index of vehicle in board.vehicles that is selected by mouse
var mouseOffset = 0; // offset from origin of selected vehicle

// get position of mouse at a mouse event
function getMousePos(evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left - borderWidth,
		y: evt.clientY - rect.top - borderWidth
	};
}

// get position of finger at a touch event
function getTouchPos(evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.touches[0].clientX - rect.left - borderWidth,
		y: evt.touches[0].clientY - rect.top - borderWidth
	};
}

// select vehicle
canvas.addEventListener('mousedown', function(evt) {
	selectVehicle(getMousePos(evt));
});
canvas.addEventListener('touchstart', function(evt) {
	if(evt.changedTouches[0].identifier == 0) {
		selectVehicle(getTouchPos(evt));
	}
	fingerDown = true;
});

// deselect vehicle
canvas.addEventListener('mouseup', deselectVehicle);
canvas.addEventListener('mouseleave', deselectVehicle);
canvas.addEventListener('touchleave', deselectVehicle);
canvas.addEventListener('touchend', function(evt) {
	if(evt.changedTouches[0].identifier == 0) {
		deselectVehicle();
		fingerDown = false;
	}
});

// move vehicle
canvas.addEventListener('mousemove', function(evt) {
	if(!fingerDown) {
		moveVehicle(getMousePos(evt));
	}
});
canvas.addEventListener('touchmove', function(evt) {
	if(evt.changedTouches[0].identifier == 0) {
		moveVehicle(getTouchPos(evt));
	}
});

// moves a vehicle to the given position
function moveVehicleTo(vehicle, pos) {
	if (vehicle.horiz) {
		vehicle.x = pos;
	} else {
		vehicle.y = pos;
	}
	// place the vehicle in the prototype
	board.placeVehicle(vehicle, true);
	drawFrame();
}

// start moving a vehicle
function selectVehicle(pos) {
	// if puzzle is loaded
	if(gameOver || !board || selectedVehicleIndex != null) {
		return;
	}
	// find if pos is over a vehicle on the board
	for(i in board.vehicles) {
		var v = board.vehicles[i];
		if(v.horiz) {
			if((v.x * squareSize <= pos.x) && (pos.x <= (v.x + v.size) * squareSize) && (v.y * squareSize <= pos.y) && (pos.y <= (v.y + 1) * squareSize)) {
				selectedVehicleIndex = i;
				mouseOffset = pos.x - (v.x * squareSize);
				break;
			}
		} else {
			if((v.x * squareSize <= pos.x) && (pos.x <= (v.x + 1) * squareSize) && (v.y * squareSize <= pos.y) && (pos.y <= (v.y + v.size) * squareSize)) {
				selectedVehicleIndex = i;
				mouseOffset = pos.y - (v.y * squareSize);
				break;
			}
		}
	}
	if(selectedVehicleIndex != null) {
		var selectedVehicle = board.vehicles[selectedVehicleIndex];
		var pos;
		if (selectedVehicle.horiz) {
			pos = selectedVehicle.x;
		} else {
			pos = selectedVehicle.y;
		}
		currentMove = new Move(selectedVehicle, pos, pos);
		board.placeVehicle(selectedVehicle, false);
	}
}

// drag a vehicle
function moveVehicle(pos) {
	if(selectedVehicleIndex != null) {
		var selectedVehicle = board.vehicles[selectedVehicleIndex];
		if(selectedVehicle.horiz) {
			var newX = (pos.x - mouseOffset) / squareSize;
			if(newX < selectedVehicle.x) {
				// if it's being dragged to the left
				for(var testX = Math.floor(selectedVehicle.x) - 1; testX >= Math.floor(newX); testX--) {
					if(board.occupied[testX][selectedVehicle.y]) {
						newX = testX + 1;
						break;
					}
				}
                if (board.occupied[Math.floor(newX)][selectedVehicle.y]) {
                    console.log("hes cheating left");
                    return;
                }
                selectedVehicle.x = newX;
                drawFrame();
			} else {
				// if it's being dragged to the right
				for(var testX = Math.ceil(selectedVehicle.x) + selectedVehicle.size; testX <= Math.ceil(newX) + selectedVehicle.size - 1; testX++) {
					if(board.occupied[testX][selectedVehicle.y]) {
						newX = testX - selectedVehicle.size;
						break;
					}
				}
                if (board.occupied[Math.floor(newX)][selectedVehicle.y]) {
                    console.log("hes cheating right");
                    return;
                }
                selectedVehicle.x = newX;
                drawFrame();
			}
			// move vehicle horizontally
			selectedVehicle.x = newX;
		} else {
			var newY = (pos.y - mouseOffset) / squareSize;
			// check other vehicles
			if(newY < selectedVehicle.y) {
				// if it's being dragged up
				for(var testY = Math.floor(selectedVehicle.y) - 1; testY >= Math.floor(newY); testY--) {
					if(board.occupied[selectedVehicle.x][testY]) {
						newY = testY + 1;
						break;
					}
				}
                if(board.occupied[selectedVehicle.x][Math.floor(newY)]) {
                    console.log("hes cheating up");
                    return;
                }
                selectedVehicle.y = newY;
                drawFrame();
			} else {
				// if it's being dragged down
				for(var testY = Math.ceil(selectedVehicle.y) + selectedVehicle.size; testY <= Math.ceil(newY) + selectedVehicle.size - 1; testY++) {
					if(board.occupied[selectedVehicle.x][testY]) {
						newY = testY - selectedVehicle.size;
						break;
					}
				}
                if(board.occupied[selectedVehicle.x][Math.floor(newY)]) {
                    console.log("hes cheating down");
                    return;
                }
                selectedVehicle.y = newY;
                drawFrame();
			}
			// move vehicle vertically
			selectedVehicle.y = newY;
		}
		drawFrame();
	}
}

// stop moving a vehicle
function deselectVehicle(evt) {
	if(selectedVehicleIndex) {
		var selectedVehicle = board.vehicles[selectedVehicleIndex];
		// snap selected vehicle to nearest spot
		var pos;
		if(selectedVehicle.horiz) {
			pos = Math.round(selectedVehicle.x);
		} else {
			pos = Math.round(selectedVehicle.y);
		}
		moveVehicleTo(selectedVehicle, pos);
		saveMove(selectedVehicleIndex, currentMove);
		// draw frame, twice to avoid rendering bugs
		drawFrame();
		// check for victory and output code
		if(selectedVehicle.isVip && selectedVehicle.x >= board.width - selectedVehicle.size + 1) {
			openFinish();
			selectedVehicle.x = board.width + 1;
			drawFrame();
			gameOver = true;
			submitLog(true);
		}
		// deselect vehicle
		selectedVehicleIndex = null;
	}
}

// prevent touch scrolling
document.body.addEventListener("touchstart", function (e) {
	if (e.target == canvas) {
		e.preventDefault();
	}
}, false);
document.body.addEventListener("touchend", function (e) {
	if (e.target == canvas) {
		e.preventDefault();
	}
}, false);
document.body.addEventListener("touchmove", function (e) {
	if (e.target == canvas) {
		e.preventDefault();
	}
}, false);

// DO THE STUFF

getPuzzleFile();
waitToQuit();
