/*!
 * Auto Complete 5.0
 * November 22, 2009
 * Corey Hart @ http://www.codenothing.com
 */ 
jQuery(function($){
	// Normal Auto-complete initiation
	$('input[name=search1]').autoComplete();

	// Add enabling feature (disable to begin with)
	$('input[name=enable-1]').attr('disabled', 'true').click(function(){
		$('input[name=search1]').autoComplete();
		$('input[name=destroy-1]').attr('disabled', false);
		$(this).attr('disabled', 'true');
		// Rebind global focus
		bindGlobalFocus();
	});
	// Add disabling feature
	$('input[name=destroy-1]').click(function(){
		$('input[name=search1]').autoComplete('destroy');
		$('input[name=enable-1]').attr('disabled', false);
		$(this).attr('disabled', 'true');
	});



	// Auto-complete preventing form submission, and firing onSelect function
	$('input[name=search2]').autoComplete({
		// preventEnterSubmit is already flagged true by default
		onSelect: function(event, ui){
			alert('You have selected ' + ui.data.value);
		}
	});



	// Auto-complete using seperate ajax script/post values
	$('input[name=search3]').autoComplete({
		ajax: 'ajax2.php',
		postData: {
			hook1: 'Do something on hook1',
			hook2: 1942,
			hook3: 'Do something with hook3'
		}
	});



	// Auto-complete using metadata and maxiumum requests
	$('input[name=search4]').autoComplete({
		onMaxRequest: function(event, ui){
			$(this).css('background-color', 'red');
			alert('Sorry, but you have used up the maximum number of reqests allowed, and ' + ui.search + ' was not processed');
		}
	});
	// Clear requests and remove red background
	$('input[name=search4-submit]').click(function(){
		$('input[name=search4]').autoComplete('flush').css('background-color', 'white').val('').focus();
	});



	// Auto-complete with trigger
	$('#input-c').autoComplete();
	// Trigger full 'c' list
	$('#submit-c').click(function(){
		$('#input-c').autoComplete('button.ajax', {all:true, letter:'c'}, 'ALL_LETTER_C_REQUESTS');
	});
	// Trigger full 'd' list
	$('#submit-d').click(function(){
		$('#input-c').autoComplete('button.ajax', {all:true, letter:'d'},  'ALL_LETTER_D_REQUESTS');
	});
	// Clear just the cache, not the # of requests
	$('#submit-flush').click(function(){
		$('#input-c').autoComplete('flush', true);
	});



	// Autocomplete on User Supplied data
	$('input[name=search6]').autoComplete({
		dataSupply: ['jane', 'john', 'doe', 'amy', 'alice', 'louis', 'liz', {value: 'mark'}, {value: 'merideth', display: 'Merideth Johnson'}]
	});
	// Trigger whole list
	$('#search6').click(function(){
		$('input[name=search6]').autoComplete('button-supply');
	});



	// Multiple words, autofill, and striped lists
	$('input[name=search7]').autoComplete({
		multiple: true,
		multipleSeparator: ' ',
		autoFill: true,
		striped: 'auto-complete-striped',
		// Add a delay as autofill takes some time
		delay: 200
	});




	/**
	 * Currently Focused Div
	 */
	function bindGlobalFocus(){
		var $div = $('#AutoCompleteFocus');
		// Clear last event and rebind it (to ensure this focus event always gets called last)
		$('input[type=text]').unbind('focus.ac-example').bind('focus.ac-example', function(){
			var f = $.autoComplete.getFocus(), p = $.autoComplete.getPrevious();
			$div.find('.current span').html(
				$.autoComplete.hasFocus ? 
				'name=' + $(f).attr('name') + "'" :
				'Nothing in Focus'
			);
			$div.find('.previous span').html(
				p ? 
				'name=' + $(p).attr('name') + "'" :
				'Nothing previously in focus'
			);
		});
	}
	bindGlobalFocus();


	// Hide/Show affect on code preview
	var code = false;
	var $div = $('#AutoCompleteFocus'); // Local copy
	var maxWidth = $(window).width() - $div.offset().left - 50;
	if (maxWidth > 500) maxWidth = 500;
	$div.find('a').click(function(){
		$(this).html(code ? '+ Open Code' : '- Close Code');
		$div.css({height: code ? 100 : 250, width: code ? 300 : maxWidth}).find('pre')[ code ? 'hide' : 'show' ]();
		code = !code;
		return false;
	});
});
