/*!
 * Auto Complete [VERSION]
 * [DATE]
 * Corey Hart @ http://www.codenothing.com
 */ 
(function( $, window, undefined ){

	// Expose autoComplete to the jQuery chain
	$.fn.autoComplete = function(){
		// Force array of arguments
		var args = Slice.call( arguments ),
			self = this, 
			first = args.shift(),
			isMethod = typeof first === 'string';

		// Deep namespacing is not supported in jQuery, a mistake I made in v4.1
		if ( isMethod ) {
			first = first.replace('.', '-');
		}
		
		// Allow for passing array of arguments, or multiple arguments
		// Eg: .autoComplete('trigger', [arg1, arg2, arg3...]) or .autoComplete('trigger', arg1, arg2, arg3...)
		// Mainly to allow for .autoComplete('trigger', arguments) to work
		// Note*: button.supply passes an array as the first param, so check against that first
		args = first === 'button-supply' || first === 'direct-supply' ? $.isArray( args[0] ) && $.isArray( args[0][0] ) ? args[0] : args :
			args[1] === undefined && $.isArray( args[0] ) ? args[0] : args;

		return isMethod ?
			// The only chain breaking operation is option, which gets passed back the
			// settings/value it requested, otherwise trigger the event and don't break the chain!
			self[ first === 'option' && args.length < 2 ? 'triggerHandler' : 'trigger' ]( 'autoComplete.' + first, args ) :

			// Allow passing a jquery event special object {from $.Event()}
			first && first[ $.expando ] ? self.trigger( first, args ) :

			// Initiate the autocomplete on each element (Only takes a single argument, the options object)
			self.each(function(){
				AutoCompleteFunction.call( this, first );
			});
	};

	// bgiframe is needed to fix z-index problem for IE6 users.
	$.fn.bgiframe = $.fn.bgiframe ? $.fn.bgiframe : $.fn.bgIframe ? $.fn.bgIframe : function(){
		// For applications that don't have bgiframe plugin installed, create a useless 
		// function that doesn't break the chain
		return this;
	};



// Internals
var
	// Munging
	TRUE = true,
	FALSE = false,

	// Copy of the slice prototype
	Slice = Array.prototype.slice,

	// Event flag that gets passed around
	ExpandoFlag = $.expando + '_autoComplete',

	// Key Codes
	KEY = {
		backspace: 8,
		tab: 9,
		enter: 13,
		space: 32,
		pageup: 33,
		pagedown: 34,
		up: 38,
		down: 40
	},

	// Attach global aspects to jQuery itself
	AutoComplete = $.autoComplete = {
		// Autocomplete Version
		version: '[VERSION]',

		// Index Counter
		counter: 0,

		// Length of stack
		length: 0,

		// Storage of elements
		stack: {},

		// Storage order of uid's
		order: [],

		// Global access to elements in use
		hasFocus: FALSE,

		getFocus: function(){
			return this.order[0] ? this.stack[ this.order[0] ] : undefined;
		},

		getPrevious: function(){
			// Removing elements cause some indexs on the order stack
			// to become undefined, so loop until one is found
			for ( var i = 0, l = AutoComplete.order.length; ++i < l; ) {
				if ( AutoComplete.order[i] ) {
					return AutoComplete.stack[ AutoComplete.order[i] ];
				}
			}

			return undefined;
		},

		remove: function( n ){
			for ( var k = -1, l = AutoComplete.order.length; ++k < l; ) {
				if ( AutoComplete.order[k] === n ) {
					AutoComplete.order[k] = undefined;
				}
			}

			AutoComplete.stack[n] = undefined;
			AutoComplete.length--;
			delete AutoComplete.stack[n];
		},

		// Returns full stack in jQuery form
		getAll: function(){
			for ( var i = -1, l = AutoComplete.counter, stack = []; ++i < l; ) {
				if ( AutoComplete.stack[i] ) {
					stack.push( AutoComplete.stack[i] );
				}
			}
			return $( stack );
		},

		defaults: {
			// To smooth upgrade process to 5.x, set backwardsCompatible to true
			backwardsCompatible: FALSE,
			// Server Script Path
			ajax: 'ajax.php',
			ajaxCache: $.ajaxSettings.cache,
			// Data Configuration
			dataSupply: [],
			dataFn: undefined,
			// Drop List CSS
			list: 'auto-complete-list',
			rollover: 'auto-complete-list-rollover',
			width: undefined, // Defined as inputs width when extended (can be overridden with this global/options/meta)
			striped: undefined,
			maxHeight: undefined,
			newList: FALSE,
			// Post Data
			postVar: 'value',
			postData: {},
			postFormat: undefined,
			// Limitations
			minChars: 1,
			maxItems: -1,
			maxRequests: 0,
			requestType: 'POST',
			// Input
			inputControl: undefined,
			autoFill: FALSE,
			nonInput: undefined,
			multiple: FALSE,
			multipleSeparator: ' ',
			// Events
			onBlur: undefined,
			onFocus: undefined,
			onHide: undefined,
			onLoad: undefined,
			onMaxRequest: undefined,
			onRollover: undefined,
			onSelect: undefined,
			onShow: undefined,
			onSubmit: function(){ return TRUE; },
			spinner: undefined,
			onListFormat: undefined,
			preventEnterSubmit: TRUE,
			delay: 0,
			// Caching Options
			useCache: TRUE,
			cacheLimit: 50
		}
	},

	// Autocomplete function
	AutoCompleteFunction = function( options ){
		// Start with counters as they are used within declarations
		AutoComplete.length++;
		AutoComplete.counter++;

		// Input specific vars
		var self = this, $input = $(self).attr( 'autocomplete', 'off' ),
			// autoComplete enabled/disabled
			Active = TRUE,
			// Track every event triggered
			LastEvent = {},
			// String of current input value
			inputval = '',
			// Holds the current list
			currentList = [],
			// Place holder for all list elements
			$elems = {length:0},
			// Place holder for the list element in focus
			$li,
			// View and heights for scrolling
			view, ulHeight, liHeight, liPerView,
			// Harcoded value for ul visiblity
			ulOpen = FALSE,
			// Timer for delay
			timeid,
			// Ajax requests holder
			xhr,
			// li element in focus during key up/down, and its data
			liFocus = -1, liData,
			// For multiple selections
			separator,
			// Index of current input
			inputIndex = AutoComplete.counter,
			// Number of requests made
			requests = 0,
			// Internal Per Input Cache
			cache = {
				length: 0,
				val: undefined,
				list: {}
			},

			// Merge defaults with passed options and metadata options
			settings = $.extend(
				{ width: $input.outerWidth() },
				AutoComplete.defaults, 
				options||{},
				$.metadata ? $input.metadata() : {}
			),

			// Create the drop list (Use an existing one if possible)
			$ul = ! settings.newList && $( 'ul.' + settings.list )[0] ?
				$( 'ul.' + settings.list ).eq(0).bgiframe().data( 'autoComplete', TRUE ) :
				$('<ul/>').appendTo('body').addClass(settings.list).bgiframe().hide().data({ 'ac-selfmade': TRUE, 'autoComplete': TRUE }),

			// Attach document click to force blur event
			$doc = $(document).bind( 'click.autoComplete-' + inputIndex, function( event ) {
				var $target;
				if ( Active && ulOpen &&
					// Double check the event timestamps to ensure there isn't a delayed reaction from a button
					( ! LastEvent || event.timeStamp - LastEvent.timeStamp > 200 ) && 
					// Check the target after all other checks are passed (less processing)
					( $target = $(event.target) ).closest('ul').data('ac-input-index') !== inputIndex &&
					// Also ensure that the input it's being clicked on either
					$target.data('ac-input-index') !== inputIndex ) {
						$ul.hide( event );
						$input.blur();
				}
				LastEvent = event;
			});

		/**
		 * Input Central
		 */ 
		$input.data({
			'autoComplete': TRUE,
			'ac-input-index': inputIndex,
			'ac-active': Active,
			'ac-initial-settings': $.extend( TRUE, {}, settings ),
			'ac-settings': settings
		})
		// Opera uses keypress as it has problems with keydown
		.bind( window.opera ? 'keypress.autoComplete' : 'keydown.autoComplete' , function( event ){
			// If autoComplete has been disabled, prevent input events
			if ( ! Active ) {
				return TRUE;
			}

			// Track last event and store code for munging
			var key = ( LastEvent = event ).keyCode, enter = FALSE;

			// Tab Key
			if ( key === KEY.tab && ulOpen ) {
				select( event );
			}
			// Enter Key
			else if ( key === KEY.enter && $li ) {
				// IE needs keydown to return false on 'enter' so the element doesn't
				// lose focus. The problem with returning false is that it prevents bubbling,
				// and most importantly, form submission. To allow for most flexibility,
				// preventEnterSubmit is used along with activity of drop down UL list to
				// determine whether focus is on the drop list or is just on the input.
				//
				// Furthermore, preventEnterSubmit will now be defaulted to true, so as
				// to affect as few implementations as possible, and the ones that need
				// form submission on 'enter' can just set this flag to false for it to
				// work as needed.
				enter = settings.preventEnterSubmit && ulOpen ? FALSE : TRUE;
				select( event );
			}
			// Up Arrow
			else if ( key === KEY.up ) {
				if ( liFocus > 0 ) {
					liFocus--;
					up( event );
				} else {
					liFocus = -1;
					$input.val(inputval);
					$ul.hide( event );
				}
			}
			// Down Arrow
			else if ( key === KEY.down ) {
				if ( liFocus < $elems.length-1 ) {
					liFocus++;
					down( event );
				}
			}
			// Page Up
			else if ( key === KEY.pageup ) {
				if ( liFocus > 0 ) {
					liFocus -= liPerView;

					if ( liFocus < 0 ) {
						liFocus = 0;
					}

					up( event );
				}
			}
			// Page Down
			else if ( key === KEY.pagedown ) {
				if ( liFocus < $elems.length-1 ) {
					liFocus += liPerView;

					if ( liFocus > $elems.length - 1 ) {
						liFocus = $elems.length-1;
					}

					down( event );
				}
			}
			// Check for non input values defined by user
			else if ( settings.nonInput && $.inArray(key, settings.nonInput) ) {
				$ul.html('').hide( event );
			}
			// Everything else is considered possible input, so
			// return before keyup prevention flag is set
			else {
				return TRUE;
			}

			// Prevent autoComplete keyup event's from triggering by
			// attaching a flag to the last event
			LastEvent[ ExpandoFlag + '_keydown' ] = TRUE;
			return enter;
		})
		.bind({
			'keyup.autoComplete': function(event){
				// If autoComplete has been disabled or keyup prevention 
				// flag has be set, prevent input events
				if ( ! Active || LastEvent[ ExpandoFlag + '_keydown' ] ) {
					return TRUE;
				}

				/**
				 * If no special operations were run on keydown,
				 * allow for regular text searching
				 */
				inputval = $input.val();
				var key = (LastEvent = event).keyCode,
					val = separator ? inputval.split(separator).pop() : inputval;

				// Still check to make sure 'enter' wasn't pressed
				if ( key != KEY.enter ) {

					// Caching key value
					cache.val = settings.inputControl === undefined ? val : 
						settings.inputControl.apply(self, settings.backwardsCompatible ? 
							[val, key, $ul, event] : [event, {val: val, key: key, ul: $ul}]);

					// Only send request if character length passes
					if ( cache.val.length >= settings.minChars ) {
						sendRequest(event, settings, cache, ( key === KEY.backspace || key === KEY.space ));
					}
					// Remove list on backspace of small string
					else if ( key == KEY.backspace ) {
						$ul.html('').hide(event);
					}
				}
			},

			'blur.autoComplete': function( event ){
				// If autoComplete has been disabled or the drop list
				// is still open, prevent input events
				if ( ! Active || ulOpen ) {
					return TRUE;
				}

				// Store event
				LastEvent = event;
				$input.data( 'ac-hasFocus', FALSE );
				liFocus = -1;

				// Only push undefined index onto order stack
				// if not already there (incase multiple blur events occur)
				if ( AutoComplete.order[0] !== undefined ) {
					AutoComplete.order.unshift( undefined );
				}

				// Expose focus
				AutoComplete.hasFocus = FALSE;
				$ul.hide( event );
				// Trigger blur callback last
				if (settings.onBlur){
					settings.onBlur.apply(self, settings.backwardsCompatible ?
					 [inputval, $ul, event] : [event, {val: inputval, ul: $ul}]);
				}
			},

			'focus.autoComplete': function( event, flag ){
				if ( ! Active || 
					// Prevent inner focus events if caused by autoComplete inner functionality
					(AutoComplete.focus === inputIndex && flag === ExpandoFlag ) || 
					// Because IE triggers focus AND closes the drop list before form submission,
					// prevent inner function focus functionality & pass on the select flag
					LastEvent[ ExpandoFlag + '_enter' ] ) {
						return TRUE;
				}

				LastEvent = event;

				if ( inputIndex != $ul.data( 'ac-input-index' ) ) {
					$ul.html('').hide(event);
				}

				// Overwrite undefined index pushed on by the blur event
				if ( AutoComplete.order[0] === undefined ) {
					if ( AutoComplete.order[1] === inputIndex ) {
						AutoComplete.order.shift();
					} else {
						AutoComplete.order[0] = inputIndex;
					}
				}
				else if ( AutoComplete.order[0] != inputIndex && AutoComplete.order[1] != inputIndex ) {
					AutoComplete.order.unshift( inputIndex );
				}

				if ( AutoComplete.order.length > AutoComplete.defaults.cacheLimit ) {
					AutoComplete.order.pop();
				}

				// Expose/Trigger focus
				AutoComplete.hasFocus = TRUE;
				$input.data('ac-hasFocus', TRUE);
				if ( settings.onFocus ) {
					settings.onFocus.apply( self, 
						settings.backwardsCompatible ? [ $ul, event ] : [ event, {ul: $ul} ]
					);
				}
			},

			/**
			 * Autocomplete Methods (Extensions off autoComplete event)
			 */ 
			// Allow for change of settings at any point
			'autoComplete.settings': function( event, newSettings ) {
				if ( ! Active ) {
					return TRUE;
				}

				// Give access to current settings and cache
				if ( $.isFunction( newSettings ) ) {
					var ret = newSettings.apply(self, settings.backwardsCompatible ? 
						[ settings, cache, $ul, event ] : [ event, { settings: settings, cache: cache, ul: $ul } ]
					);

					// Allow for extending of settings/cache based off function return values
					if ( $.isArray(ret) && ret[0] !== undefined ) {
						settings = $.extend( TRUE, {}, settings, ret[0] || settings );
						cache = $.extend( TRUE, {}, cache, ret[1] || cache );
					}
				} else {
					settings = $.extend( TRUE, {}, settings, newSettings || {} );
				}

				// Change the drop down if dev want's a differen't class attached
				$ul = ! settings.newList && $ul.hasClass( settings.list ) ? $ul : 
					! settings.newList && $( 'ul.' + settings.list )[0] ? 
						$( 'ul.' + settings.list ).bgiframe().data( 'autoComplete', TRUE ) :
						$('<ul/>').appendTo('body').addClass( settings.list ).bgiframe().hide()
							.data({ 'ac-selfmade': TRUE, 'autoComplete': TRUE });

				newUl();
				settings.requestType = settings.requestType.toUpperCase();
				separator = settings.multiple ? settings.multipleSeparator : undefined;
				$input.data('ac-settings', settings);

				// Return & Store event
				return (LastEvent = event);
			},

			// Clears the Cache & requests (requests can be blocked from clearing)
			'autoComplete.flush': function( event, cacheOnly ) {
				if ( ! Active ) {
					return TRUE;
				}
				
				if ( ! cacheOnly ) {
					requests = 0;
				}

				cache = { length: 0, val: undefined, list: {} };
				return (LastEvent = event);
			},

			// External button trigger for ajax requests
			'autoComplete.button-ajax': function( event, postData, cacheName ) {
				if ( ! Active ) {
					return TRUE;
				}

				if ( typeof postData === 'string' ){
					cacheName = postData;
					postData = {};
				}

				LastEvent = event;

				// Refocus the input box, but pass flag to prevent inner focus events
				$input.trigger( 'focus', [ ExpandoFlag ] );

				// If no cache name is given, supply a non-common word
				cache.val = cacheName || ExpandoFlag + '_button-ajax';

				return sendRequest(
					event, 
					$.extend( TRUE, {}, settings, { maxItems: -1, postData: postData || {} } ),
					cache
				);
			},

			// External button trigger for supplied data
			'autoComplete.button-supply': function( event, data, cacheName ) {
				if ( ! Active ) {
					return TRUE;
				}

				if ( typeof data === 'string' ){
					cacheName = data;
					data = undefined;
				}

				LastEvent = event;

				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger( 'focus', [ ExpandoFlag ] );

				// If no cache name is given, supply a non-common word
				cache.val = cacheName || ExpandoFlag + '_button-supply';

				// If no data is supplied, use data in settings
				data = $.isArray( data ) && data.length ? data : settings.dataSupply;

				return sendRequest(
					event,
					$.extend( TRUE, {}, settings, { maxItems: -1, dataSupply: data, dataFn: function(){ return TRUE; } }), 
					cache
				);
			},

			// Supply list directly into the result function
			'autoComplete.direct-supply': function( event, data, cacheName ) {
				if ( ! Active ) {
					return TRUE;
				}

				if ( typeof data === 'string' ){
					cacheName = data;
					data = undefined;
				}

				LastEvent = event;

				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger( 'focus', [ ExpandoFlag ] );

				// If no cache name is given, supply a non-common word
				cache.val = cacheName || ExpandoFlag + '_direct-supply';

				// If no data is supplied, use data in settings
				data = $.isArray( data ) && data.length ? data : settings.dataSupply;

				// Load the results directly into the results function bypassing request holdups
				return loadResults(
					event,
					data,
					$.extend( TRUE, {}, settings, { maxItems: -1, dataSupply: data, dataFn: function(){ return TRUE; } }), 
					cache
				);
			},

			// Triggering autocomplete programatically
			'autoComplete.search': function( event, value ) {
				if ( ! Active ) {
					return TRUE;
				}

				cache.val = value || '';
				return sendRequest( LastEvent = event, settings, cache );
			},

			// Add jquery-ui like option access
			'autoComplete.option': function( event ) {
				if ( ! Active ) {
					return TRUE;
				}

				var args = Slice.call(arguments), length = args.length;
				LastEvent = event;

				if ( length === 3 ) {
					settings[ args[1] ] = args[2];
					return args[2];
				}
				else if ( length === 2 ) {
					switch ( args[1] ) {
						case 'ul': return $ul;
						case 'cache': return cache;
						case 'xhr': return xhr;
						case 'input': return $input;
						default: return settings[ args[1] ] || undefined;
					}
				}
				else {
					return settings;
				}
			},

			// Add enabling event (only applicable after disable)
			'autoComplete.enable': function( event ) {
				$input.data( 'ac-active', Active = TRUE );
				return (LastEvent = event);
			},

			// Add disable event
			'autoComplete.disable': function( event ){
				$input.data( 'ac-active', Active = FALSE );
				$ul.html('').hide( event );
				return (LastEvent = event);
			},

			// Add a destruction function
			'autoComplete.destroy': function( event ) {
				var list = $ul.html('').hide( event ).data( 'ac-inputs' ), i;

				// Break down the input
				$input
					// Remove all autoComplete Specific Data
					.removeData('autoComplete')
					.removeData('ac-input-index')
					.removeData('ac-initial-settings')
					.removeData('ac-settings')
					.removeData('ac-active')
					// Remove all autoComplete specific events
					.unbind('.autoComplete autoComplete')
					// Unbind the form submission event
					.closest('form').unbind( 'submit.autoComplete-' + inputIndex );


				$doc.unbind( 'click.autoComplete-' + inputIndex );
				AutoComplete.remove( inputIndex );
				Active = FALSE;
				list[ inputIndex ] = undefined;
				LastEvent = event;

				// Go through the drop down list and see if any other inputs are attached to it
				for ( i in list ) {
					if ( list.hasOwnProperty(i) && list[i] === TRUE ) {
						return LastEvent;
					}
				}

				// Remove the element from the DOM if self created no other input is using it
				if ( $ul.data( 'ac-selfmade' ) === TRUE ) {
					$ul.remove();
				}

				return LastEvent;
			}
		})
		// Prevent form submission if defined in settings
		.closest('form').bind( 'submit.autoComplete-' + inputIndex, function( event ){
			if ( ! Active ) {
				return TRUE;
			}

			// Because IE triggers focus AND closes the drop list before form submission, store the flag if any
			var flag = LastEvent[ ExpandoFlag + '_enter' ] || FALSE;
			LastEvent = event;

			return settings.preventEnterSubmit ?
				( ulOpen || flag ) ? FALSE : settings.onSubmit.call( self, event, { form: this, ul: $ul } ) :
				settings.onSubmit.call( self, event, { form: this, ul: $ul } );
		});

		// Ajax/Cache Request
		function sendRequest( event, settings, cache, backSpace, timeout ){
			if (settings.spinner) {
				settings.spinner.call( self, event, { active: TRUE, ul: $ul } );
			}

			if ( timeid ) {
				timeid = clearTimeout( timeid );
			}

			// Call send request again with timeout flag if on delay
			if ( settings.delay > 0 && timeout === undefined ) {
				timeid = window.setTimeout(function(){
					sendRequest( event, settings, cache, backSpace, TRUE );
					timeid = clearTimeout( timeid );
				}, settings.delay );
				return timeid;
			}

			// Abort previous request incase it's still running
			if ( xhr ) {
				xhr.abort();
			}

			// Load from cache if possible
			if ( settings.useCache && cache.list[ cache.val ] ) {
				return loadResults( event, cache.list[ cache.val ], settings, cache, backSpace );
			}

			// Use user supplied data when defined
			if ( settings.dataSupply.length ) {
				return userSuppliedData( event, settings, cache, backSpace );
			}

			// Check Max requests first before sending request
			if ( settings.maxRequests && ++requests >= settings.maxRequests ) {
				$ul.html('').hide(event);

				if ( settings.spinner ) {
					settings.spinner.call( self, event, { active: FALSE, ul: $ul } );
				}

				if ( settings.onMaxRequest && requests === settings.maxRequests ) {
					return settings.onMaxRequest.apply( self, settings.backwardsCompatible ? 
						[ cache.val, $ul, event, inputval ] : [ event, { search: cache.val, val: inputval, ul: $ul } ]
					);
				}
				
				return FALSE;
			}

			settings.postData[ settings.postVar ] = cache.val;
			xhr = $.ajax({
				type: settings.requestType,
				url: settings.ajax,
				cache: settings.ajaxCache,
				dataType: 'json',

				data: settings.postFormat ?
					settings.postFormat.call( self, event, { data: settings.postData, search: cache.val, val: inputval, ul: $ul } ) :
					settings.postData,

				success: function( list ) {
					loadResults( event, list, settings, cache, backSpace );
				},

				error: function(){
					$ul.html('').hide( event );
					if ( settings.spinner ) {
						settings.spinner.call( self, event, { active: FALSE, ul: $ul } );
					}
				}
			});

			return xhr;
		}

		// Parse User Supplied Data
		function userSuppliedData( event, settings, cache, backSpace ){
			var list = [], args = [],
				fn = $.isFunction( settings.dataFn ),
				regex = fn ? undefined : new RegExp('^'+cache.val, 'i'),
				k = 0, entry, i = -1, l = settings.dataSupply.length;

			for ( ; ++i < l ; ) {
				// Force object wrapper for entry
				entry = settings.dataSupply[i];
				entry = typeof entry === 'object' && entry.value ? entry : {value: entry};

				// Setup arguments for dataFn in a backwards compatible way if needed
				args = settings.backwardsCompatible ? 
					[ cache.val, entry.value, list, i, settings.dataSupply, $ul, event ] :
					[ event, { val: cache.val, entry: entry.value, list: list, i: i, supply: settings.dataSupply, ul: $ul } ];

				// If user supplied function, use that, otherwise test with default regex
				if ( ( fn && settings.dataFn.apply( self, args ) ) || ( ! fn && entry.value.match( regex ) ) ) {
					// Reduce browser load by breaking on limit if it exists
					if ( settings.maxItems > -1 && ++k > settings.maxItems ) {
						break;
					}
					list.push( entry );
				}
			}

			// Use normal load functionality
			return loadResults( event, list, settings, cache, backSpace );
		}

		// Key element Selection
		function select( event ){
			// Ensure the select function only gets fired when list of open
			if ( ulOpen ) {
				if ( settings.onSelect ) {
					settings.onSelect.apply(self, settings.backwardsCompatible ? 
						[ liData, $li, $ul, event ] : [ event, { data: liData, li: $li, ul: $ul } ] );
				}

				autoFill( undefined );
				inputval = $input.val();

				// Because IE triggers focus AND closes the drop list before form submission
				// attach a flag on 'enter' selection
				if ( LastEvent.type === 'keydown' ) {
					LastEvent[ ExpandoFlag + '_enter' ] = TRUE;
				}
			}

			$ul.hide( event );
			return $li;
		}

		// Key direction up
		function up( event ){
			if ( $li ) {
				$li.removeClass( settings.rollover );
			}

			$ul.show( event );
			$li = $elems.eq( liFocus ).addClass( settings.rollover );
			liData = currentList[ liFocus ];

			if ( ! $li.length || ! liData ) {
				return FALSE;
			}

			autoFill( liData.value || '' );
			if (settings.onRollover) {
				settings.onRollover.apply( self, settings.backwardsCompatible ? 
					[ liData, $li, $ul, event ] : [ event, { data: liData, li: $li, ul: $ul } ] );
			}

			// Scrolling
			var v = liFocus * liHeight;
			if ( v < view-ulHeight ) {
				view = v+ulHeight;
				$ul.scrollTop( v );
			}

			return $li;
		}

		// Key direction down
		function down( event ){
			if ( $li ) {
				$li.removeClass( settings.rollover );
			}

			$ul.show( event );
			$li = $elems.eq( liFocus ).addClass( settings.rollover );
			liData = currentList[ liFocus ];

			if ( ! $li.length || ! liData ) {
				return FALSE;
			}

			autoFill( liData.value || '' );

			// Scrolling
			var v = ( liFocus + 1 ) * liHeight;
			if ( v > view ) {
				$ul.scrollTop( ( view = v ) - ulHeight );
			}

			if ( settings.onRollover ) {
				settings.onRollover.apply(self, settings.backwardsCompatible ? 
					[ liData, $li, $ul, event ] : [ event, { data: liData, li: $li, ul: $ul } ] );
			}

			return $li;
		}

		// Attach new show/hide functionality to only the
		// ul object (so not to infect all of jQuery)
		function newUl(){
			var hide = $ul.hide, show = $ul.show, list = $ul.data( 'ac-inputs' ) || {};

			if ( ! $ul[ ExpandoFlag ] ) {
				$ul.hide = function( event, speed, callback ) {
					if ( settings.onHide && ulOpen ) {
						settings.onHide.call( self, event, { ul: $ul } );
						LastEvent[ ExpandoFlag + '_hide' ] = TRUE;
					}

					ulOpen = FALSE;
					return hide.call( $ul, speed, callback );
				};

				$ul.show = function( event, speed, callback ) {
					if ( settings.onShow && ! ulOpen ) {
						settings.onShow.call( self, event, { ul: $ul } );
					}
					ulOpen = TRUE;
					return show.call( $ul, speed, callback );
				};

				// A flag must be attached to the $ul cached object
				$ul[ ExpandoFlag ] = TRUE;
			}

			list[ inputIndex ] = TRUE;
			return $ul.data( 'ac-inputs', list );
		}

		// Auto-fill the input
		// Credit to Jörn Zaefferer @ http://bassistance.de/jquery-plugins/jquery-plugin-autocomplete/
		// and http://www.pengoworks.com/workshop/jquery/autocomplete.htm for this functionality
		function autoFill( val ) {
			var start, end, range;

			// Set starting and ending points based on values
			if ( val === undefined ) {
				start = end = $input.val().length;
			} else {
				if ( separator ) {
					val = inputval.substr( 0, inputval.length-inputval.split( separator ).pop().length ) + val + separator;
				}

				start = inputval.length;
				end = val.length;
				$input.val( val );
			}

			// Create selection if allowed
			if ( ! settings.autoFill || start > end ){
				return FALSE;
			}
			else if ( self.createTextRange ) {
				range = self.createTextRange();
				if ( val === undefined ) {
					range.move( 'character', start );
					range.select();
				} else {
					range.collapse( TRUE );
					range.moveStart( 'character', start );
					range.moveEnd( 'character', end );
					range.select();
				}
			}
			else if ( self.setSelectionRange ) {
				self.setSelectionRange( start, end );
			}
			else if ( self.selectionStart ) {
				self.selectionStart = start;
				self.selectionEnd = end;
			}

			return TRUE;
		}

		// List Functionality
		function loadResults( event, list, settings, cache, backSpace ) {
			// Allow another level of result handling
			currentList = settings.onLoad ?
				settings.onLoad.call( self, event, { list: list, settings: settings, cache: cache, ul: $ul } ) : list;

			// Pass spinner killer as wait time is done in javascript processing
			if ( settings.spinner ) {
				settings.spinner.call( self, event, { active: FALSE, ul: $ul } );
			}

			// Store results into the cache if allowed
			if ( settings.useCache && cache.list[ cache.val ] === undefined ) {
				cache.length++;
				cache.list[ cache.val ] = list;

				// Clear cache if necessary
				if ( cache.length > settings.cacheLimit ) {
					cache.list = {};
					cache.length = 0;
				}
			}

			// Ensure there is a list
			if ( ! currentList || currentList.length < 1 ) {
				return $ul.html('').hide( event );
			}

			// Refocus list element
			liFocus = -1;

			// Initialize Vars together (save bytes)
			var offset = $input.offset(), // Input position
			    container = [], // Container for list elements
			    aci = 0, k = 0, i = -1, even = FALSE, length = currentList.length; // Loop Items

			if ( settings.onListFormat ) {
				settings.onListFormat.call( self, event, { list: currentList, settings: settings, cache: cache, ul: $ul } );
			} else {
				// Push items onto container
				for ( ; ++i < length; ){
					if ( currentList[i].value ) {
						if ( settings.maxItems > -1 && ++aci > settings.maxItems ) {
							break;
						}

						container.push(
							settings.striped && even ? '<li class="'+settings.striped+'">' : '<li>',
							currentList[i].display||currentList[i].value,
							'</li>'
						);

						even = !even;
					}
				}
				$ul.html( container.join('') );
			}

			// Cache the list items
			$elems = $ul.children('li');

			// Autofill input with first entry
			if ( settings.autoFill && ! backSpace ) {
				liFocus = 0;
				liData = currentList[0];
				autoFill( liData.value || '' );
				$li = $elems.eq(0).addClass( settings.rollover );
			}

			// Clear off old events and attach new ones
			$ul.unbind( '.autoComplete' )
			// Attach input index in focus
			.data( 'ac-input-index', inputIndex )
			// Remove focus elements hover class
			.delegate('li', 'mouseleave.autoComplete', function(){
				if ( $li ) {
					$li.removeClass( settings.rollover );
				}
			})
			// Mouseover using event delegation
			.delegate('li', 'mouseenter.autoComplete', function( event ){
				// Remove hover class from last rollover
				if ( $li ) {
					$li.removeClass( settings.rollover );
				}

				$li = $(this).addClass( settings.rollover );
				liFocus = $elems.index( $li[0] );
				liData = currentList[ liFocus ];

				if ( settings.onRollover ) {
					settings.onRollover.apply( self, settings.backwardsCompatible ? 
						[ liData, $li, $ul, event ] : [ event, { data: liData, li: $li, ul: $ul } ] );
				}
			})
			// Click event using target from mouseover
			.bind('click.autoComplete', function(event){
				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger('focus', [ ExpandoFlag ]);

				// Check against separator for input value
				$input.val( inputval = separator ? 
					inputval.substr( 0, inputval.length-inputval.split(separator).pop().length ) + liData.value + separator :
					liData.value 
				);

				$ul.hide(event);
				autoFill(undefined);

				if ( settings.onSelect ) {
					settings.onSelect.apply(self, settings.backwardsCompatible ? 
						[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
				}
			})
			// Reposition list
			.css({
				top: offset.top + $input.outerHeight(),
				left: offset.left,
				width: settings.width
			})
			// Scroll to the top
			.scrollTop(0);

			// Log li height for less computation
			liHeight = $elems.eq(0).outerHeight();

			// If Max Height specified, control it
			if ( settings.maxHeight ) {
				$ul.css({
					height: liHeight * $elems.length > settings.maxHeight ? settings.maxHeight : 'auto', 
					overflow: 'auto'
				});
			}

			// ulHeight gets manipulated, so assign to viewport seperately 
			// so referencing conflicts don't override viewport
			ulHeight = $ul.outerHeight();
			view = ulHeight;

			// Number of elements per viewport
			liPerView = liHeight === 0 ? 0 : Math.floor( view / liHeight );

			// Include amount of time it took
			// to load the list
			LastEvent.timeStamp = ( new Date() ).getTime();

			// Every function needs to return something
			return $ul.show( event );
		}

		// Non-event initialization
		newUl();
		settings.requestType = settings.requestType.toUpperCase();
		separator = settings.multiple ? settings.multipleSeparator : undefined;
		AutoComplete.stack[ inputIndex ] = self;
	};

})( jQuery, window || this );
