/**
 * Auto Complete
 * June 5, 2009
 * Corey Hart @ http://www.codenothing.com
 *
 * Auto Complete takes input from the user and runs a check through PHP to find what the user
 * is looking for. This test case runs a limited search on words that begin with the letter 'a'.
 *
 * @selclass: Optional class for arrow up/down's, defaults to 'non-404'
 * @ajaxscript: Script name for ajax request, defaults to ajax.php
 */ 
;(function($){
	$.fn.autoComplete = function(selclass, ajaxscript){
		// Cache objects
		var $obj = $(this), 
			$input = $("input[type='text']", $obj), 
			opt = -1,
			inputval = '';
			select = (selclass) ? selclass : 'non-404',
			ajax = (ajaxscript) ? ajaxscript : 'ajax.php';

		// Run on keyup
		$input.keyup(function(e){
			var key = e.keyCode;
			if ((key > 48 && key < 90) || key == 8){
				opt = -1;
				inputval = $(this).val();
				sendRequest(inputval);
			}
			else if (key == 37 || key == 39){
				opt = -1;
				$('ul', $obj).html('');
			}
			else if (key == 38){
				if (opt >= 0){
					opt--;
					var val = $('ul li', $obj).removeClass(select).eq(opt).addClass(select).attr("rel");
					val = (opt < 0) ? inputval : val;
					if (val) $input.val(val);
				}
			}
			else if (key == 40){
				if (opt < $('ul li', $obj).length-1){
					opt++;
					var val = $('ul li', $obj).removeClass(select).eq(opt).addClass(select).attr("rel");
					if (val) $input.val(val);
				}
			}
		});

		// Ajax Request
		var sendRequest = function(val){
			$.post(ajax, {value: val}, function(json){
				// Clear the List
				$('ul', $obj).html('');
				// Evaluate the return obj
				json = eval(json);
				// Show the list if there is a return
				if (json && json.length > 0){
					for (i in json){
						$('ul', $obj).append('<li rel="'+json[i].value+'">'+json[i].display+'</li>');
					}
					// Start mouse actions after list is set
					mouseaction();
				}
			});
		}

		// Run Mouse Actions
		function mouseaction(){
			// List effects
			$('ul li', $obj).mouseover(function(){
				$('ul li', $obj).removeClass(select);
				$input.val( $(this).addClass(select).attr('rel') );
			}).click(function(){
				$('ul', $obj).html('');
			});

			// Return orignal val when not hovering
			$('ul', $obj).mouseout(function(){
				$input.val(inputval);
			});

			// Clear the list when user clicks outside the form
			$(document).click(function(){
				$('ul', $obj).html('');
			});
		}
	};
})(jQuery);
