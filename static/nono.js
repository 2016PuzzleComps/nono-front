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

				// Add the information block
				$td = $("<p></p>").text("Text.");
				$tr.append( $td );

				for ( var j = 0; j < width; j++ ) {
					$td = null;
					// Add the information block at the top
					if (i < 0) {
						$td = $( '<td>' ).append( $("<p></p>").text("Texta.") );
					}
					else {
						// Build the input
						var picture = 'light.png'
						if (j%2==0) {
							picture = 'cross.png'
						}
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
			this.matrix.row[row][col] = val;
			this.matrix.col[col][row] = val;
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
			var picture = 'static/dark.png';
			this.onMouseClick(e, picture);
		},

		/**
		 * Handle right mouse click events.
		 * 
		 * @param {jQuery.event} e mouseclick event
		 */
		onRightClick: function( e ) {
			var picture = 'static/cross.png';
			this.onMouseClick(e, picture);
			return false;
		},

		/**
		 * Handle mouseclick events.
		 * 
		 * @param {jQuery.event} e mouseclick event
		 * @param {Object} picture
		 */
		onMouseClick: function( e, picture ) {
			// Do some stuff
			var row = $( e.currentTarget ).data( 'row' ),
				col = $( e.currentTarget ).data( 'col' );
			$( e.currentTarget ).attr( 'src', picture);
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