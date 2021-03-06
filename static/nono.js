/**
 * A Javascript implementation of the nonograms puzzle
 *
 * @author Eric Walker
 * 
 */
var Nonograms = ( function ( $ ){
	var _instance, _game,
		/**
		 * Default configuration options
		 * @property {Object}
		 */
		defaultConfig = {
		},
		mouseDown = false,
		isLeft = false,
		width = 5,
		top = [[1],[1,1],[3],[4],[3]],
		left = [[1,1],[2],[3],[3],[3]],
        puzzleID,
        puzzleDiff;

	/**
	 * Initialize the singleton
	 * @param {Object} config Configuration options
	 * @returns {Object} Singleton methods
	 */
	function init( config ) {
		conf = $.extend( {}, defaultConfig, config );
		_game = new Game( conf );

		/** Public methods **/
		return {
			/**
			 * Return a visual representation of the board
			 * @returns {jQuery} Game table
			 */
			getGameBoard: function() {
				return _game.getPuzzleFile();
			},

			/**
			 * Reset the game board.
			 */
			reset: function() {
				_game.resetGame();
			},

			/**
			 * Reset the game board.
			 */
			check: function() {
				_game.checkGame();
			},

            /**
             * Loads the next puzzle
             */
            nextPuzzle: function() {
                _game.nextPuzzle();
            },
		};
	}

	/**
	 * nonograms singleton engine
	 * @param {Object} config Configuration options
	 */
	function Game( config ) {
		this.config = config;

		// Initialize game parameters
		this.$cellMatrix = {};
		this.matrix = {};
		this.log = "";

		return this;
	}
	/**
	 * Game engine prototype methods
	 * @property {Object}
	 */
	Game.prototype = {
		/**
		 * Build the game GUI
		 * @returns {jQuery} Table containing 9x9 input matrix
		 */
		buildGUI: function() {
			var $td, $tr,
				$table = $( '<table>' )
					.addClass( 'nonograms-container' )
					.on( 'contextmenu', false );

			for ( var i = -1; i < width; i++ ) {
				$tr = $( '<tr>' );
				this.$cellMatrix[i] = {};
				this.matrix[i] = {};

				// Add the information block on the left
				$td = $("<td></td>");
				if ( i >= 0 ) {
					var constraints = left[i];
					$td.append("<span>" + constraints[0] + "</span>");
					for ( var j=1; j<constraints.length; j++ ) {
						$td.append("&nbsp;");
						$td.append("<span>" + constraints[j] + "</span>");
					}
				}
				$tr.append( $td );
				
                for ( var j = 0; j < width; j++ ) {
					$td = null;
					// Add the information block on top
					if (i < 0) {
						$td = $("<td></td>")
							.addClass( 'constraints-top' );
						var constraints = top[j];
						$td.append("<span>" + constraints[0] + "</span>");
						for ( var k=1; k<constraints.length; k++ ) {
							$td.append("<br/>");
							$td.append("<span>" + constraints[k] + "</span>");
						}
					} else {
						// Build the input box
						var picture = 'light.png';
						this.matrix[i][j] = 0;
						this.$cellMatrix[i][j] = $( '<img>' )
							.attr( 'src', 'static/'+picture )
							.data( 'row', i )
							.data( 'col', j )
							.on( 'mousedown', $.proxy( this.onMouseDown, this) )
							.on( 'mouseup', $.proxy( this.onMouseUp, this) )
							.on( 'mouseover', $.proxy( this.onMouseOver, this) )							
							.on( 'contextmenu',  $.proxy( this.onRightClick, this) );

						$td = $( '<td>' ).append( this.$cellMatrix[i][j] );
					}
					// Add the block to the row
					$tr.append( $td );
				}
				// Append to table
				$table.append( $tr );
			}
			// Return the GUI table
			$("#board").html($table);
		},

		/**
		 * Gets a puzzle file from the server
		 */
		getPuzzleFile: function () {
			var oReq = new XMLHttpRequest();
			var load = this.loadBoardFromText;
			oReq.addEventListener('load', function() {
				resp = JSON.parse(this.responseText);
				if(resp.success) {
					puzzleID = resp.puzzle_id;
                    puzzleDiff = resp.stats.puzzle_score;
					return load(resp.puzzle_file);
				} else {
					alert(resp.message);
				}
			});
			oReq.open("GET", "http://" + window.location.hostname + ":" + window.location.port + "/puzzle");
			oReq.send(null);
		},

		// submit solve log to server
		submitLog: function(completed) {
			var oReq = new XMLHttpRequest();
			var finish = this.openFinish;
			// on successful response
			oReq.addEventListener('load', function() {
				var title;
				var body;
				if(this.status == 200) {
					var resp = JSON.parse(this.responseText);
					if(resp.success) {
						title = "Good job!";
                        body = "Based off your solve history, we recommend this puzzle.\n"+
                            "Puzzle Difficulty: " + puzzleDiff.toString() + " | Your Solve Difficulty: " + resp.stats.log_score;
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
				finish(title, body);
			});
			// on connection error
			oReq.addEventListener('error', function() {
				console.log('error');
				finish("Uh oh...", "The server seems to be down. Try again later?");
			});
			oReq.open("POST", "http://" + window.location.hostname + ":" + window.location.port + "/log");
			var status;
			if(completed) {
				status = 1;
			} else {
				status = 2;
			}
			var msg = {
				log_file: this.log,
				status: status,
                puzzle_id: puzzleID
			};
			oReq.send(JSON.stringify(msg));
		},

		/**
		 * Looks through the selected squares and gives
		 * a notification whether or not the user has won.
		 */
		checkPuzzle: function( ) {
			var inBlock = false;
			var currentCount = 0;
			var currentBlock = 0;

			// Check that all the left constraints are met
			for (var row=0; row<width; row++) {
				var constraints = left[row];
				currentCount = 0;
				currentBlock = 0;
				inBlock = false;
				for (var col=0; col<width; col++) {
					if (this.matrix[row][col] == 1) {
						if ( currentBlock > constraints.length-1 ) {
							return false;
						}
						// If we're in a block, keep adding to it
						if ( currentCount < constraints[currentBlock] ) {
							currentCount++;
						} 
						// If we've gone past the length of the block, exit
						else {
							return false;
						}
						inBlock = true;
					} else {
						// If we were looking for more blocks, but didn't
						// find any, exit
						if ( inBlock && currentCount < constraints[currentBlock] ) {
							return false;
						} 
						// If we just finished a block, then update counters
						else if ( inBlock && currentCount == constraints[currentBlock] ) {
							currentCount = 0;
							currentBlock++;
						}
						inBlock = false;
					}
				}
				if ( currentBlock < constraints.length ) {
					// Check to see if the last block ended
					if ( currentBlock+1 == constraints.length &&
							currentCount != constraints[currentBlock] ) {
						return false;
					}
				}
			}
			// Check that all the top constraints are met
			for (var col=0; col<width; col++) {
				var constraints = top[col];
				currentCount = 0;
				currentBlock = 0;
				inBlock = false;
				for (var row=0; row<width; row++) {
					if (this.matrix[row][col] == 1) {
						if ( currentBlock > constraints.length-1 ) {
							return false;
						}
						// If we're in a block, keep adding to it
						if ( currentCount < constraints[currentBlock] ) {
							currentCount++;
						} 
						// If we've gone past the length of the block, exit
						else {
							return false;
						}
						inBlock = true;
					} else {
						// If we were looking for more blocks, but didn't
						// find any, exit
						if ( inBlock && currentCount < constraints[currentBlock] ) {
							return false;
						} 
						// If we just finished a block, then update counters
						else if ( inBlock && currentCount == constraints[currentBlock] ) {
							currentCount = 0;
							currentBlock++;
						}
						inBlock = false;
					}
					this.matrix[row][col] = 0;
				}
				if ( currentBlock < constraints.length ) {
					// Check to see if the last block ended
					if ( currentBlock+1 == constraints.length &&
							currentCount != constraints[currentBlock] ) {
						return false;
					}
				}
			}
			return true;
		},



		/**
		 * Method to check to see if the game has been won
		 */
		checkGame: function() {
			if (this.checkPuzzle()) {
				this.submitLog(true);
			} else {
				alert("Something is wrong.");
			}
		},


		/**
		 * Opens the win tab
		 * 
		 * @param {String} title the title of the finish
		 * @param {String} body the body of the message
		 */
		openFinish: function(title, body) {
			document.getElementById("title").innerHTML = title;
			document.getElementById("body").innerHTML = body;
			document.getElementById("finish").style.height = "100%";
		},

        /**
         * Loads the next puzzle for the user.
         */
        nextPuzzle: function() {
            document.getElementById("finish").style.height = "0%";
            this.log = "";
            this.getPuzzleFile();
        },


		// Loads a board from a given block of text
		loadBoardFromText: function(text) {
            var lines = text.split("\n");
			var leftStrings = lines[1].split(",");
			var topStrings = lines[0].split(",");
			left = [];
			top = [];
			width = leftStrings.length;
			for (var i=0; i<width; i++) {
				left.push(leftStrings[i].split(" ").map(Number));
				top.push(topStrings[i].split(" ").map(Number));
			}
			return _game.buildGUI();
		},

		/**
		 * Toggles picture in a frame
		 * 
		 * @param {Object} row the row in the matrix
		 * @param {Object} col the col in the matrix
		 * @param {Boolean} left whether there was a left click or right
		 */
		togglePicture: function( row, col, left ) {
			// Get value from current matrix model
			// 0 = light (blank)
			// 1 = dark
			// 2 = cross
			var logString = Date.now()+" "+row+" "+col;
			var current = this.matrix[row][col];
			var picture = 'static/';
			if (left) {
				if (current == 0 || current == 2) {
					picture += 'dark.png';
					this.matrix[row][col] = 1;
					logString += " "+1;
				} else {
					picture += 'light.png';
					this.matrix[row][col] = 0;
					logString += " "+0;
				}
			} else {
				if (current == 0 || current == 1) {
					picture += 'cross.png';
					this.matrix[row][col] = 2;
					logString += " "+2;
				} else {
					picture += 'light.png';
					this.matrix[row][col] = 0;
					logString += " "+0;
				}
			}
			this.$cellMatrix[row][col].attr( 'src', picture);
			this.log += logString+"\n";
		},

		/**
		 * Handle keyup events.
		 *
		 * @param {jQuery.event} e Keyup event
		 */
		onKeyUp: function( e ) {
			var starttime, endtime, elapsed,
				isValid = true,
				val = $.trim( $( e.currentTarget ).val() ),
				row = $( e.currentTarget ).data( 'row' ),
				col = $( e.currentTarget ).data( 'col' );

			// Cache value in matrix
			this.matrix[row][col] = val;
		},

		/**
		 * Handle mousedown events.
		 * 
		 * @param {jQuery.event} e mousedown event
		 */
		onMouseDown: function( e ) {
			mouseDown = true;
			isLeft = false;
			e = e || window.event;
			if (e.which == 1) {
				isLeft = true;
			}
			var row = $( e.currentTarget ).data( 'row' ),
				col = $( e.currentTarget ).data( 'col' );
			this.togglePicture(row, col, isLeft);
		},

		/**
		 * Handle mouseup events.
		 * 
		 * @param {jQuery.event} e mouseup event
		 */
		onMouseUp: function( e ) {
			mouseDown = false;
		},

		/**
		 * Handle mouseOver events.
		 * 
		 * @param {jQuery.event} e mouseover event
		 */
		onMouseOver: function( e ) {
			if (mouseDown) {
				// Do some stuff
				var row = $( e.currentTarget ).data( 'row' ),
					col = $( e.currentTarget ).data( 'col' );
				this.togglePicture(row, col, isLeft);
			}
		},

		/**
		 * Resets the game, looping through all the squares
		 * and resetting them to default (blank) values.
		 */
		resetGame: function( ) {
			var picture = 'static/light.png';
			for (var row=0; row<width; row++) {
				for (var col=0; col<width; col++) {
					this.matrix[row][col] = 0;
					this.$cellMatrix[row][col].attr( 'src', picture);
				}
			}
		},
	};

	return {
		/**
		 * Get the nonograms instance, but don't allow
		 * more than one instance
		 */
		getInstance: function( config ) {
			if ( !_instance ) {
				_instance = init( config );
			}
			return _instance;
		}
	};
} )( jQuery );
