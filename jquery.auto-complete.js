/**
 * Auto Complete 3.1
 * August 22, 2009
 * Corey Hart @ http://www.codenothing.com
 */ 
;(function($){
	var inputIndex = 0; // Input counter
	$.fn.autoComplete = function(options){
		return this.each(function(){
			// Cache objects
			var $input = $(this).attr('autocomplete', 'off'), $li, timeid, timeid2, blurid, 
				// Set defaults and include metadata support
				settings = $.extend({
					// Inner Function Defaults (Best to leave alone)
					opt: -1,
					inputval: '',
					mouseClick: false,
					dataName: 'ac-data',
					inputIndex: ++inputIndex,
					// Server Script Path
					ajax: 'ajax.php',
					// Drop List CSS
					list: 'auto-complete-list',
					rollover: 'auto-complete-list-rollover',
					width: $input.outerWidth(),
					// Post Data
					postVar: 'value',
					postData: {},
					// Limitations
					minChars: 1,
					maxRequests: 0,
					requests: 0, // Inner Function Default
					// Events
					onMaxRequest: function(){},
					onSelect: function(){},
					onRollover: function(){},
					onBlur: function(){},
					onFocus: function(){},
					preventEnterSubmit: false,
					enter: true, // Inner Function Default
					delay: 100,
					selectFuncFire: true, // Inner Function Default
					// Caching Options
					useCache: true,
					cacheLimit: 50,
					cacheLength: 0, // Inner Function Default
					cache: {} // Inner Function Default
				}, options||{}, $.metadata ? $input.metadata() : {});

			// Create the drop list (Use an existing one if possible)
			var $ul = $('ul.'+settings.list)[0] ? $('ul.'+settings.list) : $('<ul/>').appendTo('body').addClass(settings.list).hide();

			// Run on keyup
			$input.keyup(function(e){
				var key = e.keyCode;
				settings.mouseClick = false;
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
					if (settings.inputval.length >= settings.minChars){
						// Send request on timer so fast typing doesn't send requests too fast
						if (timeid) clearTimeout(timeid);
						timeid = setTimeout(function(){ sendRequest(); }, settings.delay);
					} else if (key == 8) { // Remove list on backspace of small string
						$ul.html('').hide();
					}
				}
			}).blur(function(){
				settings.enter = true;
				blurid = setTimeout(function(){
					if (settings.mouseClick)
						return false;
					settings.opt = -1;
					settings.onBlur.call($input[0], settings.inputval, $ul);
					$ul.hide();
				}, 150);
			}).focus(function(){
				settings.enter = false;
				// If ul is not associated with current input, clear it
				if (settings.inputIndex != $ul.data('ac-input-index'))
					$ul.html('').hide();
				settings.onFocus.call($input[0], $ul);
			}).parents('form').eq(0).submit(function(){
				return settings.preventEnterSubmit ? settings.enter : true;
			});
	
			// Ajax/Cache Request
			function sendRequest(){
				// Check Max reqests first
				if (settings.maxRequests && ++settings.requests >= settings.maxRequests)
					return settings.requests > settings.maxRequests ?
						false : settings.onMaxRequest.call($input[0], settings.inputval, $ul);

				// Load from cache if possible
				if (settings.useCache && settings.cache[settings.inputval])
					return loadResults(settings.cache[settings.inputval]);

				// Send request server side
				settings.postData[settings.postVar] = settings.inputval
				$.post(settings.ajax, settings.postData, function(json){
					// Store results into the cache if need be
					if (settings.useCache){
						settings.cacheLength++;
						settings.cache[settings.inputval] = json;
						// Shift out old cache if necessary
						if (settings.cacheLength > settings.cacheLimit){
							settings.cache = {};
							settings.cacheLength = 0;
						}
					}
					// Show the list if there is a return, else hide it
					loadResults(json);
				}, 'json');
			}

			// List Functionality
			function loadResults(list){
				// Ensure there is a list
				if (!list || list.length < 1)
					return $ul.html('').hide();

				// Clear the List and align it properly
				var o = $input.offset(); // Store offsets
				$ul.data('ac-input-index', settings.inputIndex).html('').css({
					top: o.top + $input.outerHeight(),
					left: o.left,
					width: settings.width
				});

				// Add new rows to the list
				var aci = 0, i; // Index list items
				for (i in list)
					if (list[i].value)
						$('<li/>').appendTo($ul).html(list[i].display||list[i].value)
							.data(settings.dataName, list[i]).data('ac-index', aci++);

				// Return orignal val when not hovering, and add mouse actions to list
				$ul.show().mouseout(function(){
					$('li.'+settings.rollover, $ul).removeClass(settings.rollover);
					if (! settings.mouseClick && settings.selectFuncFire)
						$input.val(settings.inputval);
				}).children('li').mouseover(function(){
					$li = $(this);
					$('li.'+settings.rollover, $ul).removeClass(settings.rollover);
					$input.val( $li.addClass(settings.rollover).data(settings.dataName).value );
					settings.onRollover.call($input[0], $li.data(settings.dataName), $li, $ul);
					settings.opt = $li.data('ac-index');
				}).click(function(){
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
