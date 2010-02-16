<?php
/**
 * Auto Complete 5.1
 * February 16, 2010
 * Corey Hart @ http://www.codenothing.com
 *
 *
 * This is the dev page of the index.html demo page. It ensures
 * that the browser never uses a cached version of the plugin or the
 * css file included
 */ 
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
	 "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
	<title>Auto Complete 5.1</title>
	<script type='text/javascript' src='../jquery/jquery-1.3.2.js'></script>
	<script type='text/javascript' src='http://getfirebug.com/releases/lite/1.2/firebug-lite-compressed.js'></script>
	<script type='text/javascript' src='../jquery/jquery.metadata.js'></script>
	<script type='text/javascript' src='../src/jquery.auto-complete.js?<?= mktime() ?>'></script>
	<script type='text/javascript' src='js.js?<?= mktime() ?>'></script>
	<link rel='stylesheet' type='text/css' href='../src/jquery.auto-complete.css?<?= mktime() ?>' />
	<link rel='stylesheet' type='text/css' href='styles.css?<?= mktime() ?>' />
</head>
<body>



<h1>Auto Complete 5.1</h1>


<div>
Auto Complete sends input from a user to a script server side, and creates a drop down with the
JSON data returned. It supports the <a href='http://docs.jquery.com/Plugins/Metadata'>metadata plugin</a>, 
as well as script level caching. A few examples are included on this page, but check out the <a href='../docs/index.html'>docs</a> 
for a full list of features.
</div>

<div style='margin-top: 30px;'>
For those upgrading from 4.1, check out the <a href='../changelog'>changelog</a>, the 
<a href='../docs/index.html#backwardsCompatible'>backwardsCompatible</a> setting, and the 
<a href='4.1-compatible.html'>4.1-compatible</a> page showing that upgrading works.
</div>

<div style='margin-top:40px;'>
A list of commonly misspelled words in English found at 
<a href='http://www.esldesk.com/esl-quizzes/misspelled-words/misspelled-words.htm'>
	http://www.esldesk.com/esl-quizzes/misspelled-words/misspelled-words.htm
</a>
is used as the sample result set.
</div>



<!-- Floating Info -->
<div id='AutoCompleteFocus'>
	<div class='current'>
		<b>Currently in Focus:</b>&nbsp;&nbsp;<span></span>
	</div>
	<div class='previous'>
		<b>Previously in Focus:</b> <span></span>
	</div>
	<a href='#'>+ Open Code</a>
<pre>
var $div = $('#AutoCompleteFocus');
$('input[type=text]').focus(function(){
	var f = $.autoComplete.getFocus(), p = $.autoComplete.getPrevious();
	$div.find('.current span').html('#' + $.autoComplete.focus + ": '" + $(f).attr('name') + "'");
	$div.find('.previous span').html('#' + $.autoComplete.previous + ": '" + $(p).attr('name') + "'");
});
</pre>
</div>




<div style='margin:40px 0 0 0;'>
<b>Normal Initiation</b>
<pre>
$('input[name=search1]').autoComplete();
</pre>
<input type='text' name='search1' style='width:300px;' />
<input type='submit' name='enable-1' value='Enable' />
<input type='submit' name='destroy-1' value='Destroy' />
</div>

<pre style='margin: 20px 0 40px 0;'>
/**
 * Button code for above example
 */
// Add enabling feature (disable to begin with)
$('input[name=enable-1]').attr('disabled', 'true').click(function(){
	$('input[name=search1]').autoComplete();
	$('input[name=destroy-1]').attr('disabled', false);
	$(this).attr('disabled', 'true');
});
// Add disabling feature
$('input[name=destroy-1]').click(function(){
	$('input[name=search1]').autoComplete('destroy');
	$('input[name=enable-1]').attr('disabled', false);
	$(this).attr('disabled', 'true');
});
</pre>


<hr size='1' width='300px;' align='left' />


<div style='margin:40px 0;'>
<b>Prevent form submission when running callbacks on selection</b>
<pre>
// Auto-complete preventing form submission, and firing onSelect function
$('input[name=search2]').autoComplete({
	// preventEnterSubmit is already flagged true by default
	onSelect: function(event, ui){
		alert('You have selected ' + ui.data.value);
	}
});
</pre>
<form action='index.php' method='GET'>
<input type='text' name='search2' style='width:300px;' />
<input type='submit' value='Do Something' />
</form>
</div>


<hr size='1' width='300px;' align='left' />


<div style='margin:40px 0;'>
<b>Send requests to different page with extra POST parameters,<br>returning with no display value.</b>
<pre>
$('input[name=search3]').autoComplete({
	ajax: 'ajax2.php',
	postData: {
		hook1: 'Do something on hook1',
		hook2: 1942,
		hook3: 'Do something with hook3'
	}
});
</pre>
<input type='text' name='search3' style='width:300px;' />
</div>



<hr size='1' width='300px;' align='left' />



<div style='margin:40px 0;'>
<b>Use the metadata plugin to set limitations on a per input basis.</b>
<pre>
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
&lt;input type='text' name='search4' style='width:300px;' class='someclass {minChars: 2, maxRequests: 10}' /&gt;
</pre>
<input type='text' name='search4' style='width:300px;' class='someclass {minChars: 2, maxRequests: 10}' />
<input type='submit' name='search4-submit' value="Clear Requests ('flush')" />
</div>



<hr size='1' width='300px;' align='left' />



<div style='margin:40px 0;'>
<b>Trigger autoComplete by clicking an  external button.</b>
<pre>
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
</pre>
<input type='text' style='width:300px;' id='input-c' name='search5' />
<input type='submit' id='submit-c' value="All 'c'" />
<input type='submit' id='submit-d' value="All 'd'" />
<input type='submit' id='submit-flush' value="Flush Cache" />
</div>



<hr size='1' width='300px;' align='left' />



<div style='margin:40px 0;'>
<b>Supply a data set for autoComplete to use.</b>
<pre>
// Autocomplete on User Supplied data
$('input[name=search6]').autoComplete({
	dataSupply: ['jane', 'john', 'doe', 'amy', 'alice', 'louis', 'liz', {value: 'mark'}, {value: 'merideth', display: 'Merideth Johnson'}]
});
// Trigger whole list
$('#search6').click(function(){
	$('input[name=search6]').autoComplete('button.supply');
});
</pre>
<input type='text' style='width:300px;' name='search6' />
<input type='submit' id='search6' value="All Values" />
</div>



<hr size='1' width='300px;' align='left' />



<div style='margin:40px 0;'>
<b>Allow for multiple words, autofill, and striped lists.</b>
<pre>
// Multiple words, autofillm and striped lists
$('input[name=search7]').autoComplete({
	multiple: true,
	multipleSeparator: ' ',
	autofill: true,
	striped: 'auto-complete-striped',
	// Add a delay as autofill takes some time
	delay: 200
});
</pre>
<input type='text' style='width:300px;' name='search7' />
</div>




<div style='margin-top:275px;'>
Be sure to check out the <a href='../docs/index.html'>docs</a> for a full list of options.
<br clear='all' />
</div>


<div style='margin-top:50px;'>
	<a href='http://www.codenothing.com/archives/jquery/auto-complete/'>Back to Original Article</a>
</div>


</body>
</html>
