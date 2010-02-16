/*!
 * Auto Complete 5.0
 * November 22, 2009
 * Corey Hart @ http://www.codenothing.com
 */ 
(function($, undefined){
	// Expose autoComplete to the jQuery chain
	$.fn.autoComplete = function(){
		// Force array of arguments
		var args = Slice.call(arguments),
			self = this, 
			first = args.shift(),
			isMethod = (typeof first === 'string');

		// Deep namespacing is not supported in jQuery, a mistake I made in v4.1
		if (isMethod) first = first.replace('.', '-');
		
		// Allow for passing array of arguments, or multiple arguments
		// Eg: .autoComplete('trigger', [arg1, arg2, arg3...]) or .autoComplete('trigger', arg1, arg2, arg3...)
		// Mainly to allow for .autoComplete('trigger', arguments) to work
		// Note*: button.supply passes an array as the first param, so check against that first
		args = first === 'button-supply' || first === 'direct-supply' ? $.isArray(args[0]) && $.isArray(args[0][0]) ? args[0] : args :
			args[1] === undefined && $.isArray(args[0]) ? args[0] : args;

		// Autocomplete special triggers
		return isMethod ?
			// The only chain breaking operation is option, which gets passed back the
			// settings/value it requested, otherwise trigger the event and don't break the chain!
			$(self)[ first === 'option' && args.length < 2 ? 'triggerHandler' : 'trigger' ]('autoComplete.'+first, args) :

			// Allow passing a jquery event special object {from $.Event()}
			first && first[$.expando] ? $(self).trigger(first, args) :

			// Initiate the autocomplete (Only takes a single argument, the options object)
			AutoCompleteFunction.call(self, first);
	};

	// bgiframe is needed to fix z-index problem for IE6 users.
	$.fn.bgiframe = $.fn.bgiframe ? $.fn.bgiframe : $.fn.bgIframe ? $.fn.bgIframe : function(){
		// For applications that don't have bgiframe plugin installed, create a useless 
		// function that doesn't break the chain
		return this;
	};

	// The expando won't get attached to the jQuery object until 1.4 release(or so it seems in the nightlies)
	// To get the expando, we must create an event through jQuery, and filter it out.
	$.expando = $.expando !== undefined ? $.expando : (function(){
		var event = $.Event('keyup'), i;
		for (i in event)
			if (i.indexOf('jQuery') === 0)
				return i;
		// Use the event's timestamp on instances where 
		// expando isn't attached to the event object
		// (is it ever not?)
		return 'jQuery'+event.timeStamp;
	})();

	// Current timestamp
	function now(){
		return (new Date).getTime();
	}



// Internals
var
	// Munging
	TRUE = true,
	FALSE = false,

	// Copy of the slice prototype
	Slice = Array.prototype.slice,

	// Attach global aspects to jQuery itself
	AutoComplete = $.autoComplete = {
		// Index Counter
		counter: 0,

		// Attach length of stack to object
		length: 0,

		// Storage of elements
		stack: {},

		// Storage order of uid's
		order: [],

		// Global access to elements in use
		hasFocus: FALSE,

		// Callback methods for getting focus element
		getFocus: function(){
			return this.order[0] ? this.stack[ this.order[0] ] : undefined;
		},
		getPrevious: function(){
			// Removing elements cause some indexs on the order stack
			// to become undefined, so loop until one is found
			for ( var i=1, l=this.order.length; i < l; i++ )
				if (this.order[i])
					return this.stack[ this.order[i] ];
			// If none are found, return undefined
			return undefined;
		},

		// Attempts to remove element from the stack
		remove: function(i){
			for ( var k=0, l=this.order.length; k < l; k++ )
				if (this.order[k] === i)
					this.order[k] = undefined;
			this.stack[i] = undefined;
			this.length--;
			delete this.stack[i];
		},

		// Returns full stack in jQuery form
		getAll: function(){
			for ( var i = 0, l = this.counter, stack = []; i < l; i++ )
				if (this.stack[i])
					stack.push(this.stack[i]);
			return $(stack);
		},

		defaults: {
			// To smooth upgrade process to 5.0, set backwardsCompatible to true
			backwardsCompatible: FALSE,
			// Server Script Path
			ajax: 'ajax.php',
			ajaxCache: $.ajaxSettings.cache,
			// Data Configuration
			dataSupply: [],
			dataFn: undefined,
			dataName: 'ac-data',
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
			onMaxRequest: function(){},
			onRollover: undefined,
			onSelect: undefined,
			onShow: undefined,
			onSubmit: function(){return TRUE;},
			spinner: undefined,
			preventEnterSubmit: TRUE,
			delay: 0,
			// Caching Options
			useCache: TRUE,
			cacheLimit: 50
		}
	},

	// Autocomplete function
	AutoCompleteFunction = function(options){
		return this.each(function(){
		var
			// Cache a copy of the input element
			self = this,
			// Cache Input Object
			$input = $(self).attr('autocomplete', 'off'),
			// autoComplete enabled/disabled
			Active = TRUE,
			// Track every event triggered
			LastEvent = {},
			// String of current input value
			inputval = '',
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
			inputIndex = (function(){ AutoComplete.length++; return ++AutoComplete.counter; })(),
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
			$ul = !settings.newList && $('ul.'+settings.list)[0] ?
				$('ul.'+settings.list).eq(0).bgiframe().data('autoComplete', TRUE) :
				$('<ul/>').appendTo('body').addClass(settings.list).bgiframe().hide().data('ac-selfmade', TRUE).data('autoComplete', TRUE),

			// Attach document click to force blur event
			$doc = $(document).bind('click.autoComplete-'+inputIndex, function(event){
				var $elem;
				// Make sure input is active and list is open
				if (Active && ulOpen &&
					// Double check the event timestamps to ensure there isn't
					// a delayed reaction from a button
					(!LastEvent || event.timeStamp - LastEvent.timeStamp > 200) && 
					// Check the target after all other checks are passed (less processing)
					( $elem = $(event.target) ).closest('ul').data('ac-input-index') !== inputIndex &&
					// Also ensure that the input it's being clicked on either
					$elem.data('ac-input-index') !== inputIndex){
						$ul.hide(event);
						// We want to trigger all blur events, so don't
						// pass special autoComplete flags here through the
						// trigger function
						$input.blur();
				}
				LastEvent = event;
			});

			// Attach special fn's to ul
			newUl();
			// Upper case requestType now instead of on every call
			settings.requestType = settings.requestType.toUpperCase();
			// Set separator to local variable for munging
			separator = settings.multiple ? settings.multipleSeparator : undefined;
			// Add input to stack
			AutoComplete.stack[inputIndex] = self;

			/**
			 * Input Central
			 */ 
			// Show autocomplete has been initialized on this element
			$input.data('autoComplete', TRUE)
			// Attach input index and initial settings
			.data('ac-input-index', inputIndex)
			// autoComplete Activity
			.data('ac-active', Active)
			// Attach settings to initail and current states
			.data('ac-initial-settings', $.extend(TRUE, {}, settings)).data('ac-settings', settings)
			// Central autoComplete specific function
			// Opera uses keypress as it has problems with keydown
			.bind(window.opera ? 'keypress.autoComplete' : 'keydown.autoComplete', function(event){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Track last event and store code for munging
				var key = (LastEvent = event).keyCode, enter = FALSE;

				// Tab Key
				if (key == 9 && ulOpen){
					select(event);
				}
				// Enter Key
				else if (key == 13 && $li){
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
					select(event);
				}
				// Up Arrow
				else if (key == 38){
					if (liFocus > 0){
						liFocus--;
						up(event);
					}else{
						liFocus = -1;
						$input.val(inputval);
						$ul.hide(event);
					}
				}
				// Down Arrow
				else if (key == 40){
					if (liFocus < $elems.length-1){
						liFocus++;
						down(event);
					}
				}
				// Page Up
				else if (key == 33){
					if (liFocus > 0){
						liFocus -= liPerView;
						if (liFocus < 0) liFocus = 0;
						up(event);
					}
				}
				// Page Down
				else if (key == 34){
					if (liFocus < $elems.length-1){
						liFocus += liPerView;
						if (liFocus > $elems.length-1) liFocus = $elems.length-1;
						down(event);
					}
				}
				// Check for non input values defined by user
				else if (settings.nonInput && $.inArray(key, settings.nonInput)){
					$ul.html('').hide(event);
				}
				// Everything else is considered possible input, so
				// return before keyup prevention flag is set
				else{
					return TRUE;
				}

				// Prevent autoComplete keyup event's from triggering by
				// attaching a flag to the last event
				LastEvent[$.expando + '_autoComplete_keydown'] = TRUE;
				return enter;
			})
			// Run a keydown event to specifically catch the tab key
			.bind('keyup.autoComplete', function(event){
				// If autoComplete has been disabled or keyup prevention 
				// flag has be set, prevent input events
				if (!Active || LastEvent[$.expando + '_autoComplete_keydown']) return TRUE;

				/**
				 * If no special operations were run on keydown,
				 * allow for regular text searching
				 */
				inputval = $input.val();
				var key = (LastEvent = event).keyCode,
					val = separator ? inputval.split(separator).pop() : inputval;
				// Still check to make sure 'enter' wasn't pressed
				if (key != 13){
					// Caching key value
					cache.val = settings.inputControl === undefined ? val : 
						settings.inputControl.apply(self, settings.backwardsCompatible ? 
							[val, key, $ul, event] : [event, {val: val, key: key, ul: $ul}]);
					// Only send request if character length passes
					if (cache.val.length >= settings.minChars)
						sendRequest(event, settings, cache, (key==8||key==32));
					// Remove list on backspace of small string
					else if (key == 8)
						$ul.html('').hide(event);
				}
			})
			// Bind specific Blur Actions
			.bind('blur.autoComplete', function(event){
				// If autoComplete has been disabled or the drop list
				// is still open, prevent input events
				if (!Active || ulOpen) return TRUE;
				// Store event
				LastEvent = event;
				$input.data('ac-hasFocus', FALSE);
				liFocus = -1;
				// Only push undefined index onto order stack
				// if not already there (incase multiple blur events occur)
				if (AutoComplete.order[0] !== undefined)
					AutoComplete.order.unshift(undefined);
				// Expose focus
				AutoComplete.hasFocus = FALSE;
				$ul.hide(event);
				// Trigger blur callback last
				if (settings.onBlur) settings.onBlur.apply(self, settings.backwardsCompatible ?
					[inputval, $ul, event] : [event, {val: inputval, ul: $ul}]);
			})
			// Bind specific focus actions
			.bind('focus.autoComplete', function(event, flag){
				// If autoComplete has been disabled but not destoyed, just return true 
				if (!Active || 
					// Prevent inner focus events if caused by autoComplete inner functionality
					(AutoComplete.focus === inputIndex && flag === $.expando + '_autoComplete') || 
					// Because IE triggers focus AND closes the drop list before form submission,
					// prevent inner function focus functionality & pass on the select flag
					LastEvent[$.expando + '_autoComplete_enter'])
						return TRUE;
				// Store event
				LastEvent = event;
				// If ul is not associated with current input, clear it
				if (inputIndex != $ul.data('ac-input-index'))
					$ul.html('').hide(event);
				// Store focus into input
				$input.data('ac-hasFocus', TRUE);
				// Overwrite undefined index pushed on by the blur event
				if (AutoComplete.order[0] === undefined){
					if (AutoComplete.order[1] === inputIndex)
						AutoComplete.order.shift();
					else
						AutoComplete.order[0] = inputIndex;
				}
				// Only push another uid if it's not the current one
				else if (AutoComplete.order[0] != inputIndex && AutoComplete.order[1] != inputIndex)
					AutoComplete.order.unshift(inputIndex);
				// Keep the order array to within the global cacheLimit size
				if (AutoComplete.order.length > AutoComplete.defaults.cacheLimit)
					AutoComplete.order.pop();
				// Expose focus
				AutoComplete.hasFocus = TRUE;
				// Trigger focus callback last
				if (settings.onFocus) settings.onFocus.apply(self, settings.backwardsCompatible ? [$ul, event] : [event, {ul: $ul}]);
			})

			/**
			 * Autocomplete Methods
			 * -Extensions off autoComplete event
			 */ 
			// Allows for change of settings at any point
			.bind('autoComplete.settings', function(event, newSettings){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Give access to current settings and cache
				if ($.isFunction(newSettings)){
					var ret = newSettings.apply(self, settings.backwardsCompatible ? 
						[settings, cache, $ul, event] : [event, {settings: settings, cache: cache, ul: $ul}]);
					// Allow for extending of settings/cache based off function return values
					if ($.isArray(ret) && ret[0] !== undefined){
						settings = $.extend(TRUE, {}, settings, ret[0]||settings);
						cache = $.extend(TRUE, {}, cache, ret[1]||cache);
					}
				}else{
					// Extend deep so settings are kept
					settings = $.extend(TRUE, {}, settings, newSettings||{});
				}
				// Upper case requestType now instead of on every call
				settings.requestType = settings.requestType.toUpperCase();
				// Reassign local separator
				separator = settings.multiple ? settings.multipleSeparator : undefined;
				// Restablish current settings onto the inputs data
				$input.data('ac-settings', settings);
				// Change the drop down if user want's a differen't class attached
				$ul = !settings.newList && $ul.hasClass(settings.list) ? $ul : 
					!settings.newList && $('ul.'+settings.list)[0] ? $('ul.'+settings.list).bgiframe().data('autoComplete', TRUE) : 
					$('<ul/>').appendTo('body').addClass(settings.list).bgiframe().hide()
						.data('ac-selfmade', TRUE).data('autoComplete', TRUE);
				// Attach special ul fn's
				newUl();
				// Return & Store event
				return LastEvent = event;
			})
			// Clears the Cache & requests (requests can be blocked on request)
			.bind('autoComplete.flush', function(event, cacheOnly){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				cache = {length:0, val:undefined, list:{}};
				if (!cacheOnly) requests = 0;
				// Store & return event
				return LastEvent = event;
			})
			// External button trigger for ajax requests
			.bind('autoComplete.button-ajax', function(event, postData, cacheName){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Store event
				LastEvent = event;
				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger('focus', [$.expando + '_autoComplete']);
				// Allow for just passing the cache name
				if (typeof postData === 'string'){
					cacheName = postData;
					postData = {};
				}
				// If no cache name is given, supply a non-common word
				cache.val = cacheName||'NON_404_<>!@$^&';
				// Timer is done within sendRequest
				return sendRequest(
					event, 
					$.extend(TRUE, {}, settings, {maxItems: -1, postData: postData||{}}), 
					cache
				);
			})
			// External button trigger for supplied data
			.bind('autoComplete.button-supply', function(event, data, cacheName){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Store event
				LastEvent = event;
				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger('focus', [$.expando + '_autoComplete']);
				// Allow for just passing of cacheName
				if (typeof data === 'string'){
					cacheName = data;
					data = undefined;
				}
				// If no cache name is given, supply a non-common word
				cache.val = cacheName||'NON_404_SUPPLY_<>!@$^&';
				// If no data is supplied, use data in settings
				data = $.isArray(data) && data.length ? data : settings.dataSupply;
				// Timer done within sendRequest
				return sendRequest(
					event,
					$.extend(TRUE, {}, settings, {maxItems: -1, dataSupply: data, dataFn: function(){ return TRUE; } }), 
					cache
				);
			})
			// Supply list directly into the result function
			.bind('autoComplete.direct-supply', function(event, data, cacheName){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Store event
				LastEvent = event;
				// Refocus the input box and pass flag to prevent inner focus events
				$input.trigger('focus', [$.expando + '_autoComplete']);
				// Allow for just passing of cacheName
				if (typeof data === 'string'){
					cacheName = data;
					data = undefined;
				}
				// If no cache name is given, supply a non-common word
				cache.val = cacheName||'NON_404_SUPPLY_<>!@$^&';
				// If no data is supplied, use data in settings
				data = $.isArray(data) && data.length ? data : settings.dataSupply;
				// Load the results directly into the results function
				// bypassing error checks (Only do)
				return loadResults(
					event,
					data,
					$.extend(TRUE, {}, settings, {maxItems: -1, dataSupply: data, dataFn: function(){ return TRUE; } }), 
					cache
				);
			})
			// Triggering autocomplete programatically
			.bind('autoComplete.search', function(event, value){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				cache.val = value||'';
				// Timer done within sendRequest
				return sendRequest(LastEvent = event, settings, cache);
			})
			// Add jquery-ui like option access
			.bind('autoComplete.option', function(event){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Store event
				LastEvent = event;
				var args = Slice.call(arguments), length = args.length;
				return length == 3 ? (function(){settings[ args[1] ] = args[2]; $input.data('ac-settings', settings); return args[2];})() :
					length == 2 ? (function(){ 
						switch (args[1]){
							case 'ul': return $ul;
							case 'cache': return cache;
							case 'xhr': return xhr;
							case 'input': return $input;
							default: return settings[ args[1] ] || undefined;
						}
					})() :
					settings;
			})
			// Add enabling event (only applicable after disable)
			.bind('autoComplete.enable', function(event){
				$input.data('ac-active', Active = TRUE);
				// Store & return event
				return LastEvent = event;
			})
			// Add disable event
			.bind('autoComplete.disable', function(event){
				// Store event
				$input.data('ac-active', Active = FALSE);
				$ul.html('').hide(event);
				// Store & return event
				return LastEvent = event;
			})
			// Add a destruction function
			.bind('autoComplete.destroy', function(event){
				// Break down the input
				$input
					// Remove all autoComplete Specific Data
					.removeData('autoComplete')
					.removeData('ac-input-index')
					.removeData('ac-initial-settings')
					.removeData('ac-settings')
					.removeData('ac-active')
					// Remove all autoComplete specific events
					.unbind('.autoComplete')
					// jQuery requires every namespace attached to
					// a made up event to be removed separately
					.unbind( 'autoComplete.' + [
							'settings',
							'flush',
							'button-ajax',
							'button-supply',
							'direct-supply',
							'search',
							'option',
							'enable',
							'disable',
							'destroy'
						].join(' autoComplete.') )
					// Unbind the form submission event
					.parents('form').eq(0).unbind('submit.autoComplete-'+inputIndex);
				// Remove document click event
				$doc.unbind('click.autoComplete-'+inputIndex);
				// Remove from stack
				AutoComplete.remove(inputIndex);
				// Disable Activity
				Active = FALSE;
				// Clean the UL
				var list = $ul.html('').hide(event).data('ac-inputs'), i;
				list[inputIndex] = undefined;
				for (i in list)
					if (list[i] === TRUE)
						return LastEvent = event;
				// Remove the element from the DOM if self created no other input is using it
				if ($ul.data('ac-selfmade') === TRUE) $ul.remove();
				// Store & return event
				return LastEvent = event;
			})

			// Back to normal events
			// Prevent form submission if defined in settings
			.parents('form').eq(0).bind('submit.autoComplete-'+inputIndex, function(event){
				// If autoComplete has been disabled, prevent input events
				if (!Active) return TRUE;
				// Because IE triggers focus AND closes the drop list before form submission, store the flag if any
				var flag = LastEvent[$.expando + '_autoComplete_enter']||FALSE;
				// Store event
				LastEvent = event;
				return settings.preventEnterSubmit ?
					(ulOpen || flag) ? FALSE : settings.onSubmit.call(self, event, {form: this, ul: $ul}) :
					settings.onSubmit.call(self, event, {form: this, ul: $ul});
			});
	
			// Ajax/Cache Request
			function sendRequest(event, settings, cache, backSpace, timeout){
				// Pass spinner enabler
				if (settings.spinner) settings.spinner.call(self, event, {active: TRUE, ul: $ul});
				// Centralize the timer request
				if (timeid) timeid = clearTimeout(timeid);
				// Call send request again with timeout flag if on delay
				if (settings.delay > 0 && timeout === undefined) return timeid = setTimeout(function(){
						sendRequest(event, settings, cache, backSpace, TRUE);
						timeid = clearTimeout(timeid);
					}, settings.delay);

				// Abort previous request incase it's still running
				if (xhr) xhr.abort();

				// Load from cache if possible
				if (settings.useCache && cache.list[cache.val])
					return loadResults(event, cache.list[cache.val], settings, cache, backSpace);

				// Use user supplied data when defined
				if (settings.dataSupply.length)
					return userSuppliedData(event, settings, cache, backSpace);

				// Check Max requests first before sending request
				if (settings.maxRequests && ++requests >= settings.maxRequests){
					$ul.html('').hide(event);
					if (settings.spinner) settings.spinner.call(self, event, {active: FALSE, ul: $ul});
					return requests > settings.maxRequests ?
						FALSE : settings.onMaxRequest.apply(self, settings.backwardsCompatible ? 
								[cache.val, $ul, event, inputval] : [event, {search: cache.val, val: inputval, ul: $ul}]);
				}

				// Send request server side
				settings.postData[settings.postVar] = cache.val
				// Switched to base ajax request to remove list on errors
				return xhr = $.ajax({
					type: settings.requestType,
					url: settings.ajax,
					data: settings.postData,
					dataType: 'json',
					cache: settings.ajaxCache,
					success: function(list){
						loadResults(event, list, settings, cache, backSpace);
					},
					error: function(){
						$ul.html('').hide(event);
						if (settings.spinner) settings.spinner.call(self, event, {active: FALSE, ul: $ul});
					}
				});
			}

			// Parse User Supplied Data
			function userSuppliedData(event, settings, cache, backSpace){
				var list = [], // Result list
					args = [], // Backwards Compatibility
					fn = $.isFunction(settings.dataFn), // User supplied function
					regex = fn ? undefined : new RegExp('^'+cache.val, 'i'), // Only compile regex if needed
					k = 0, entry, i=0, l=settings.dataSupply.length; // Looping vars

				// Loop through each entry and find matches
				for ( ; i < l; i++ ){
					entry = settings.dataSupply[i];
					// Force object
					entry = typeof entry === 'object' && entry.value ? entry : {value: entry};
					// Setup arguments for dataFn in a backwards compatible way if needed
					args = settings.backwardsCompatible ? 
						[cache.val, entry.value, list, i, settings.dataSupply, $ul, event] :
						[event, {val: cache.val, entry: entry.value, list: list, i: i, supply: settings.dataSupply, ul: $ul}];
					// If user supplied function, use that, otherwise test with default regex
					if ((fn && settings.dataFn.apply(self, args)) || (!fn && entry.value.match(regex))){
						// Reduce browser load by breaking on limit if it exists
						if (settings.maxItems > -1 && ++k > settings.maxItems)
							break;
						list.push(entry);
					}
				}
				// Use normal load functionality
				return loadResults(event, list, settings, cache, backSpace);
			}

			// Key element Selection
			function select(event){
				// Ensure the select function only gets fired when list of open
				if (ulOpen){
					if (settings.onSelect) settings.onSelect.apply(self, settings.backwardsCompatible ? 
						[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
					autoFill(undefined);
					inputval = $input.val();
					// Because IE triggers focus AND closes the drop list before form submission
					// attach a flag on 'enter' selection
					if (LastEvent.type=='keydown') LastEvent[$.expando + '_autoComplete_enter'] = TRUE;
				}
				$ul.hide(event);
				return $li;
			}

			// Key direction up
			function up(event){
				if ($li) $li.removeClass(settings.rollover);
				$ul.show(event);
				$li = $elems.eq(liFocus).addClass(settings.rollover);
				liData = $li.data(settings.dataName);
				if (!$li.length || !liData) return FALSE;
				autoFill( liData.value||'' );
				if (settings.onRollover) settings.onRollover.apply(self, settings.backwardsCompatible ? 
					[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
				// Scrolling
				var v = liFocus*liHeight;
				if (v < view-ulHeight){
					view = v+ulHeight
					$ul.scrollTop( v );
				}
				return $li;
			}

			// Key direction down
			function down(event){
				if ($li) $li.removeClass(settings.rollover);
				$ul.show(event);
				$li = $elems.eq( liFocus ).addClass( settings.rollover );
				liData = $li.data( settings.dataName );
				if (!$li.length || !liData) return FALSE;
				autoFill( liData.value||'' );
				// Scrolling
				var v = (liFocus+1)*liHeight;
				if (v > view)
					$ul.scrollTop( (view = v) - ulHeight );
				// Callback
				if (settings.onRollover) settings.onRollover.apply(self, settings.backwardsCompatible ? 
					[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
				return $li;
			}

			// Attach new show/hide functionality to only the
			// ul object (so not to infect all of jQuery)
			function newUl(){
				if (! $ul[$.expando + '_autoComplete']){
					// Make a copy of the old show/hide
					var hide = $ul.hide, show = $ul.show;
					$ul.hide = function(event, speed, callback){
						if (settings.onHide && ulOpen){
							settings.onHide.call(self, event, {ul: $ul});
							LastEvent[$.expando + '_autoComplete_hide'] = TRUE;
						}
						ulOpen = FALSE;
						return hide.call($ul, speed, callback);
					};
					$ul.show = function(event, speed, callback){
						if (settings.onShow && !ulOpen) settings.onShow.call(self, event, {ul: $ul});
						ulOpen = TRUE;
						return show.call($ul, speed, callback);
					};
					// A flag must be attached to the $ul cached object
					$ul[$.expando + '_autoComplete'] = TRUE;
				}
				var list = $ul.data('ac-inputs')||{};
				list[inputIndex] = TRUE;
				return $ul.data('ac-inputs', list);
			}

			// Auto-fill the input
			// Credit to Jörn Zaefferer @ http://bassistance.de/jquery-plugins/jquery-plugin-autocomplete/
			// and http://www.pengoworks.com/workshop/jquery/autocomplete.htm for this functionality
			function autoFill(val){
				// Set starting and ending points based on values
				if (val === undefined){
					var start, end; start = end = $input.val().length;
				}else{
					if (separator) val = inputval.substr( 0, inputval.length-inputval.split(separator).pop().length ) + val + separator;
					var start = inputval.length, end = val.length;
					$input.val(val);
				}

				// Create selection if allowed
				if (! settings.autoFill || start > end){
					return FALSE;
				}
				else if (self.createTextRange){
					var range = self.createTextRange();
					if (val === undefined) {
						range.move('character', start);
						range.select();
					}else{
						range.collapse(TRUE);
						range.moveStart("character", start);
						range.moveEnd("character", end);
						range.select();
					}
				}
				else if (self.setSelectionRange){
					self.setSelectionRange(start, end);
				}
				else if (self.selectionStart){
					self.selectionStart = start;
					self.selectionEnd = end;
				}
				return TRUE;
			}

			// List Functionality
			function loadResults(event, list, settings, cache, backSpace){
				// Allow another level of result handling
				if (settings.onLoad) list = settings.onLoad.call(self, event, {list: list, settings: settings, cache: cache, ul: $ul});
				// Pass spinner killer as wait time is done in javascript processing
				if (settings.spinner) settings.spinner.call(self, event, {active: FALSE, ul: $ul});
				// Store results into the cache if allowed
				if (settings.useCache && cache.list[cache.val] === undefined){
					cache.length++;
					cache.list[cache.val] = list;
					// Clear cache if necessary
					if (cache.length > settings.cacheLimit){
						cache.list = {};
						cache.length = 0;
					}
				}

				// Ensure there is a list
				if (!list || list.length < 1)
					return $ul.html('').hide(event);

				// Refocus list element
				liFocus = -1;

				// Initialize Vars together (save bytes)
				var offset = $input.offset(), // Input position
				    container = [], // Container for list elements
				    aci=0,k=0,i=0,even=FALSE,length=list.length; // Loop Items

				// Push items onto container
				for (; i < length; i++){
					if (list[i].value){
						if (settings.maxItems > -1 && ++aci > settings.maxItems)
							break;
						container.push(
							settings.striped && even ? '<li class="'+settings.striped+'">' : '<li>',
							list[i].display||list[i].value,
							'</li>'
						);
						even = !even;
					}
				}

				// Load items into list
				$elems = $ul.html( container.join('') ).children('li');
				for ( length = $elems.length; k < length; k++ ){
					$.data( $elems[k], settings.dataName, list[k] );
					$.data( $elems[k], 'ac-index', k );
				}


				// Autofill input with first entry
				if (settings.autoFill && ! backSpace){
					liFocus = 0;
					liData = list[0];
					autoFill( liData.value||'' );
					$li = $elems.eq(0).addClass( settings.rollover );
				}

				// Clear off old events and attach new ones
				$ul.unbind('.autoComplete')
				// Attach input index in focus
				.data('ac-input-index', inputIndex)
				// Remove focus elements hover class
				.bind('mouseout.autoComplete', function(){
					$li.removeClass(settings.rollover);
				})
				// Mouseover using event delegation
				.bind('mouseover.autoComplete', function(event){
					$li = $(event.target).closest('li');
					// Ensure 'li' mouseover
					if ($li.length < 1) return FALSE;
					// Remove hover class from last rollover
					$elems.filter('.'+settings.rollover).removeClass(settings.rollover);
					liFocus = $li.addClass(settings.rollover).data('ac-index');
					liData = $li.data( settings.dataName );
					if (settings.onRollover) settings.onRollover.apply(self, settings.backwardsCompatible ? 
						[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
				})
				// Click event using target from mouseover
				.bind('click.autoComplete', function(event){
					// Refocus the input box and pass flag to prevent inner focus events
					$input.trigger('focus', [$.expando + '_autoComplete']);
					liData = $li.data(settings.dataName);
					// Check against separator for input value
					$input.val( inputval = separator ? 
						inputval.substr( 0, inputval.length-inputval.split(separator).pop().length ) + liData.value + separator :
						liData.value 
					);
					$ul.hide(event);
					autoFill(undefined);
					if (settings.onSelect) settings.onSelect.apply(self, settings.backwardsCompatible ? 
						[liData, $li, $ul, event] : [event, {data: liData, li: $li, ul: $ul}]);
				})
				// Reposition list
				.css({
					top: offset.top + $input.outerHeight(),
					left: offset.left,
					width: settings.width
				})
				// Scroll to the top
				.scrollTop(0);

				// If Max Height specified, control it
				if (settings.maxHeight) $ul.css({
					height: liHeight*$elems.length > settings.maxHeight ? settings.maxHeight : 'auto', 
					overflow: 'auto'
				});

				// Apply list height to view for inital value,
				// and show the list now so no jerkiness from css
				// changes are shown to the user
				ulHeight = $ul.show(event).outerHeight();
				view = ulHeight;
				// Log li height for less computation
				liHeight = $elems.eq(0).outerHeight();
				// Number of elements per viewport
				liPerView = Math.floor(view/liHeight);

				// Include amount of time it took
				// to load the list
				LastEvent.timeStamp = now();

				// Every function needs to return something
				return $ul;
			}
		});
	};
})(jQuery);
