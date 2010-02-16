/*!
 * Auto Complete 4.1
 * October 5, 2009
 * Corey Hart @ http://www.codenothing.com
 *
 * NOTE*: This is the 4.0 compatible version, please
 * change your code asap to work with the new 4.1 version
 */ 
;(function($, undefined){
	/*
	 * Arguments List (Internal Notes for 4.0 Only)
	 * 0: trigger
	 * 1: options
	 * 2: keyCode
	 * 3: stick
	 * 4: ignore
	 * 5: deep
	 */ 
	// Expose autoComplete to the jQuery chain
	$.fn.autoComplete = function(){
		var a = Array.prototype.slice.call(arguments), args = [], i;
		if (typeof a[0] === 'object'){
			// Hacked unshift method 
			// (unshift() doesn't work in IE?)
			args.push(undefined);
			for (i in a) args.push(a[i]);
		}else{ args = a; }

		// Autocomplete special triggers
		if (typeof args[0] === 'string')
			// Trigger the requested function, and dont break the chain!
			return $(this).trigger('autoComplete.'+args.shift(), args);

		// If no number is provided, initiate the auto-complete function
		if (args[2] === undefined || typeof args[2] !== 'number')
			return autoComplete.call(this, args[1]);

		/*
		 * Base trigger section is left for backwards compatibility with 4.0
		 * release, and will be phased out with future releases.
		 *
		 * PLEASE WORK ON TRANSFERING CODE LOGIC TO PREDEFINED EVENTS
		 */ 
		// Create new jQuery event (but only trigger the autoComplete function) and attach keycode
		var event = $.Event('keyup.autoComplete');
		event.keyCode = args[2];

		// Ensure deep action is boolean
		if (typeof args[5] !== 'boolean') args[5] = true;

		// Trigger auto complete and Don't break the chain!
		return $(this).trigger(event, args);
	};

	// bgiframe is needed to fix z-index problem for IE6 users.
	$.fn.bgiframe = $.fn.bgiframe ? $.fn.bgiframe : $.fn.bgIframe ? $.fn.bgIframe : function(){
		// For applications that don't have bgiframe plugin installed, create a useless 
		// function that doesn't break the chain
		return this;
	};

	// Autocomplete function
	var inputIndex = 0, autoComplete = function(options){
		return this.each(function(){
			// Cache objects
			var $input = $(this).attr('autocomplete', 'off'), $li, timeid, timeid2, blurid,
				// Internal Per Input Cache
				cache = {
					length: 0,
					val: undefined,
					list: {}
				},
				// Set defaults and include metadata support
				settings = $.extend({
					// Inner Function Defaults (Best to leave alone)
					opt: -1,
					inputval: undefined,
					mouseClick: false,
					dataName: 'ac-data',
					inputIndex: ++inputIndex,
					// Server Script Path
					ajax: 'ajax.php',
					dataSupply: [],
					dataFn: undefined,
					// Drop List CSS
					list: 'auto-complete-list',
					rollover: 'auto-complete-list-rollover',
					width: $input.outerWidth(),
					// Post Data
					postVar: 'value',
					postData: {},
					// Limitations
					minChars: 1,
					maxItems: -1,
					maxRequests: 0,
					requestType: 'post',
					requests: 0, // Inner Function Default
					// Events
					onMaxRequest: function(){},
					onSelect: function(){},
					onRollover: function(){},
					onBlur: function(){},
					onFocus: function(){},
					inputControl: function(v){return v;},
					preventEnterSubmit: false,
					enter: true, // Inner Function Default
					delay: 100,
					selectFuncFire: true, // Inner Function Default
					// Caching Options
					useCache: true,
					cacheLimit: 50
				}, options||{}, $.metadata ? $input.metadata() : {}),

				// Create the drop list (Use an existing one if possible)
				$ul = $('ul.'+settings.list)[0] ?
					$('ul.'+settings.list).bgiframe() :
					$('<ul/>').appendTo('body').addClass(settings.list).bgiframe().hide();

			// Input Events
			$input.data('ac-input-index', settings.inputIndex) // Attach input index
			// Central autoComplete specific function
			.bind('keyup.autoComplete', function(event, trigger, opts, keyCode, stick, ignore, deep){
				var key = event.keyCode;
				settings.mouseClick = false;

				// Re-extend if settings are passed
				if (opts && typeof opts === 'object'){
					// Make a safe copy of the old settings
					var oldSettings = $.extend(true, {}, settings);
					// Go deep for single postData var change
					settings = $.extend(deep, {}, settings, opts);
					// Ignore trigger if user specifies
					if (ignore){
						if (! stick) settings = oldSettings;
						return true;
					}
				}
				
				// Keys
				if (key == 13 && $li){ // Enter
					settings.opt = -1;
					// Ensure the select function only gets fired once
					if (settings.selectFuncFire) {
						settings.selectFuncFire = false;
						settings.onSelect.call($input[0], $li.data(settings.dataName), $li, $ul);
						if (timeid2) clearTimeout(timeid2);
						timeid2 = setTimeout(function(){ settings.selectFuncFire = true; }, 1000);
					}
					$ul.hide();
				}
				else if (key == 38){ // Up arrow
					if (settings.opt > 0){
						settings.opt--;
						$li = $('li', $ul).removeClass(settings.rollover).eq(settings.opt).addClass(settings.rollover);
						$input.val($li.data(settings.dataName).value||'');
						settings.onRollover.call($input[0], $li.data(settings.dataName), $li, $ul);
					}else{
						settings.opt = -1;
						$input.val(settings.inputval);
						$ul.hide();
					}
				}
				else if (key == 40){ // Down arrow
					if (settings.opt < $('li', $ul).length-1){
						settings.opt++;
						$li = $('li', $ul.show()).removeClass(settings.rollover).eq(settings.opt).addClass(settings.rollover);
						$input.val($li.data(settings.dataName).value||'');
						settings.onRollover.call($input[0], $li.data(settings.dataName), $li, $ul);
					}
				}
				// Everything else is possible input
				else{
					settings.opt = -1;
					settings.inputval = $input.val();
					cache.val = settings.inputControl.call($input, settings.inputval, key);
					if (cache.val.length >= settings.minChars){
						// Send request on timer so fast typing doesn't overload requests
						if (timeid) clearTimeout(timeid);
						timeid = setTimeout(function(){ 
							sendRequest(settings, cache);
							// Remove temporary settings on timeout so they stick throughout the drop
							if (oldSettings && ! stick) 
								settings = oldSettings;
							clearTimeout(timeid);
						}, settings.delay);
					} else if (key == 8) { // Remove list on backspace of small string
						$ul.html('').hide();
					}
				}

				// Remove temporary settings change unless specified not too
				if (oldSettings && ! stick && ! timeid)
					settings = oldSettings;
			})
			// Bind specific Blur Actions
			.bind('blur.autoComplete', function(){
				settings.enter = true;
				blurid = setTimeout(function(){
					if (settings.mouseClick)
						return false;
					settings.opt = -1;
					settings.onBlur.call($input[0], settings.inputval, $ul);
					$ul.hide();
				}, 150);
			})
			// Bind specific focus actions
			.bind('focus.autoComplete', function(){
				settings.enter = false;
				// If ul is not associated with current input, clear it
				if (settings.inputIndex != $ul.data('ac-input-index'))
					$ul.html('').hide();
				settings.onFocus.call($input[0], $ul);
			})

			/**
			 * Autocomplete Special Triggers
			 * -Extensions off autoComplete event
			 */ 
			// Allows for change of settings at any point
			.bind('autoComplete.settings', function(event, newSettings){
				// Give access to current settings and cache
				if ($.isFunction(newSettings)){
					var ret = newSettings.call($input[0], settings, cache);
					// Allow for extending of settings/cache based off function return values
					if ($.isArray(ret) && ret.length){
						settings = $.extend(true, {}, settings, ret[0]||settings);
						cache = $.extend(true, {}, cache, ret[1]||cache);
					}
				}else{
					// Extend deep so settings are kept
					settings = $.extend(true, {}, settings, newSettings||{});
				}
			})
			// Clears the Cache & requests (requests can be blocked on request)
			.bind('autoComplete.flush', function(event, cacheOnly){
				cache = {length:0, val:undefined, list:{}};
				if (!cacheOnly) settings.requests = 0;
			})
			// External button trigger for ajax requests
			.bind('autoComplete.button.ajax', function(event, postData, cacheName){
				// Refocus the input box
				$input.focus();
				// Remove blur trigger
				if (blurid) clearTimeout(blurid);
				// Allow for just passing the cache name
				if (typeof postData === 'string'){
					cacheName = postData;
					postData = {};
				}
				// If no cache name is given, supply a non-common word
				cache.val = cacheName||'NON_404_<>!@$^&';
				// Send request on timer so focus event doesn't override
				if (timeid) clearTimeout(timeid);
				timeid = setTimeout(function(){ 
					sendRequest($.extend(true, {}, settings, {opt: -1, maxItems: -1, postData: postData||{}}), cache);
					clearTimeout(timeid);
				}, settings.delay);
			})
			// External button trigger for supplied data
			.bind('autoComplete.button.supply', function(event, data, cacheName){
				// Refocus the input box
				$input.focus();
				// Remove blur trigger
				if (blurid) clearTimeout(blurid);
				// Allow for just passing of cacheName
				if (typeof data === 'string'){
					cacheName = data;
					data = undefined;
				}
				// If no cache name is given, supply a non-common word
				cache.val = cacheName||'NON_404_SUPPLY_<>!@$^&';
				// If no data is supplied, use data in settings
				data = $.isArray(data) ? data : settings.dataSupply;
				// Send request on timer so focus event doesn't override
				if (timeid) clearTimeout(timeid);
				timeid = setTimeout(function(){ 
					sendRequest($.extend(true, {}, settings, {opt: -1, maxItems: -1, dataSupply: data, dataFn: function(){return true;}}), cache);
					clearTimeout(timeid);
				}, settings.delay);
			})
			// Add a destruction function
			.bind('autoComplete.destroy', function(){
				// Unbind input events
				$input.unbind('keyup.autoComplete blur.autoComplete focus.autoComplete autoComplete')
					// Unbind the form submission event
					.parents('form').eq(0).unbind('submit.autoComplete.'+settings.inputIndex);
			})

			// Back to normal events
			// Prevent form submission if defined in settings
			.parents('form').eq(0).bind('submit.autoComplete', function(){
				return settings.preventEnterSubmit ? settings.enter : true;
			});
	
			// Ajax/Cache Request
			function sendRequest(settings, cache){
				// Check Max reqests first
				if (settings.maxRequests && ++settings.requests >= settings.maxRequests)
					return settings.requests > settings.maxRequests ?
						false : settings.onMaxRequest.call($input[0], settings.inputval, $ul);

				// Load from cache if possible
				if (settings.useCache && cache.list[cache.val])
					return loadResults(cache.list[cache.val], settings, cache);

				// Use user supplied data when defined
				if (settings.dataSupply.length)
					return userSuppliedData(settings, cache);

				// Send request server side
				settings.postData[settings.postVar] = cache.val
				$[settings.requestType](settings.ajax, settings.postData, function(json){
					// Show the list if there is a return, else hide it
					loadResults(json, settings, cache);
				// Use jQuery's method of json evaluation
				// (thus, can only send 'get' or 'post' jQuery requests)
				}, 'json');
			}

			// Parse User Supplied Data
			function userSuppliedData(settings, cache){
				var json = [], // Result list
					fn = $.isFunction(settings.dataFn), // User supplied function
					regex = fn ? undefined : new RegExp('^'+cache.val, 'i'),// Only compile regex if needed
					k = 0, entry, i; // Looping vars

				// Loop through each entry and find matches
				for (i in settings.dataSupply){
					entry = settings.dataSupply[i];
					// Force object
					entry = typeof entry === 'object' && entry.value ? entry : {value: entry};
					// If user supplied function, use that, otherwise test with default regex
					if ((fn && settings.dataFn.call($input[0], cache.val, entry.value, json, i, settings.dataSupply)) || 
							(!fn && entry.value.match(regex))){
						// Reduce browser load by breaking on limit if it exists
						if (settings.maxItems > -1 && ++k > settings.maxItems)
							break;
						json.push(entry);
					}
				}
				// Use normal load functionality
				loadResults(json, settings, cache);
			}

			// List Functionality
			function loadResults(list, settings, cache){
				// Store results into the cache if need be
				if (settings.useCache){
					cache.length++;
					cache.list[cache.val] = list;
					// Clear cache if necessary
					if (settings.cacheLength > settings.cacheLimit){
						cache.list = {};
						cache.length = 0;
					}
				}

				// Ensure there is a list
				if (!list || list.length < 1)
					return $ul.html('').hide();

				// Initialize Vars together (save bytes)
				var offset = $input.offset(), // Store offsets
					aci=0, i; // Index list items

				// Clear the List and align it properly
				$ul.data('ac-input-index', settings.inputIndex).html('').css({
					top: offset.top + $input.outerHeight(),
					left: offset.left,
					width: settings.width
				});

				// Add new rows to the list
				for (i in list){
					if (list[i].value){
						if (settings.maxItems > -1 && ++aci > settings.maxItems)
							break;
						$('<li/>').appendTo($ul).html(list[i].display||list[i].value)
							.data(settings.dataName, list[i]).data('ac-index', aci);
					}
				}

				// Remove old mouseout event and return orignal val when not hovering
				$ul.show().unbind('mouseout.autoComplete').bind('mouseout.autoComplete', function(){
					$('li.'+settings.rollover, $ul).removeClass(settings.rollover);
					if (! settings.mouseClick && settings.selectFuncFire)
						$input.val(settings.inputval);
				// Unbind any events that linger from previous drops
				// I don't understand why this helps yet, because the old li elements are
				// removed and new ones created/added to the ul element; but for now, it works
				}).children('li').unbind('mouseover.autoComplete').unbind('click.autoComplete')
				// New mouseover and click events
				.bind('mouseover.autoComplete', function(){
					$li = $(this);
					$('li.'+settings.rollover, $ul).removeClass(settings.rollover);
					$input.val( $li.addClass(settings.rollover).data(settings.dataName).value );
					settings.onRollover.call($input[0], $li.data(settings.dataName), $li, $ul);
					settings.opt = $li.data('ac-index');
				}).bind('click.autoComplete', function(){
					settings.mouseClick = true;
					if (blurid) clearTimeout(blurid);
					settings.onSelect.call($input[0], $li.data(settings.dataName), $li, $ul);
					$ul.hide();
					// Bring the focus back to the input when clicking a list member
					$input.focus();
				});
			}
		});
	};
})(jQuery);
