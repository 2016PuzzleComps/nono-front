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
		mouseDown = false;

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
				return _game.buildGUI();
			},

			/**
			 * Reset the game board.
			 */
			reset: function() {
				_game.resetGame();
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
			var width = 5;

			for ( var i = -1; i < width; i++ ) {
				$tr = $( '<tr>' );
				this.$cellMatrix[i] = {};
				this.matrix[i] = {};

				// Add the information block on top
				$td = $("<p></p>").text("b");
				$tr.append( $td );

				for ( var j = 0; j < width; j++ ) {
					$td = null;
					// Add the information block on top
					if (i < 0) {
						$td = $( '<td>' ).append( $("<p></p>").text("a.") );
					}
					else {
						// Build the input box
						var picture = 'light.png';
						this.matrix[i][j] = 0;
						this.$cellMatrix[i][j] = $( '<img>' )
							.attr( 'src', 'static/'+picture )
							.data( 'row', i )
							.data( 'col', j )
							.on( 'click', $.proxy( this.onLeftClick, this) )
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
			return $table;
		},

		/**
		 * Toggles pictures
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
			var current = this.matrix[row][col];
			var picture = 'static/';
			if (left) {
				if (current == 0 || current == 2) {
					picture += 'dark.png';
					this.matrix[row][col] = 1;
				} else {
					picture += 'light.png';
					this.matrix[row][col] = 0;
				}
			} else {
				if (current == 0 || current == 1) {
					picture += 'cross.png';
					this.matrix[row][col] = 2;
				} else {
					picture += 'light.png';
					this.matrix[row][col] = 0;
				}
			}
			this.$cellMatrix[row][col].attr( 'src', picture);
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
				$( e.currentTarget ).attr( 'src', 'static/dark.png');
			}
		},

		/**
		 * Handle left mouse click events.
		 * 
		 * @param {jQuery.event} e mouseclick event
		 */
		onLeftClick: function( e ) {
			var row = $( e.currentTarget ).data( 'row' ),
				col = $( e.currentTarget ).data( 'col' );
			this.togglePicture(row, col, true);
		},

		/**
		 * Handle right mouse click events.
		 * 
		 * @param {jQuery.event} e mouseclick event
		 */
		onRightClick: function( e ) {
			var row = $( e.currentTarget ).data( 'row' ),
				col = $( e.currentTarget ).data( 'col' );
			this.togglePicture(row, col, false);
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