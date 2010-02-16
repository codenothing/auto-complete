<html>
<head>
	<title>Auto Complete</title>
	<script type='text/javascript' src='jquery-1.3.1.min.js'></script>
	<script type='text/javascript' src='jquery.auto-complete.pack.js'></script>
	<link rel='stylesheet' type='text/css' href='styles.css' />
</head>
<body>

<!--
Auto Complete
June 5, 2009
Corey Hart @ http://www.codenothing.com
-->

<h1>Auto Complete</h1>

<span style='font-size:9pt;'>
Auto Complete takes input from the user and runs a check through PHP to find what the user<br>
is looking for. This test case runs a limited search on words that begin with the letter 'a'.
</span>

<pre style='margin-top:40px;'>
$(document).ready(function(){
	$('#auto-complete').autoComplete('select', 'ajax.php');
});
</pre>

<script type='text/javascript'>
$(document).ready(function(){
	$('#auto-complete').autoComplete('select', 'ajax.php');
});
</script>


<div id='auto-complete'>
	<input type='text' name='search' style='width:300px;' autocomplete='off' value='' />
	<input type='submit' value='Do Something' style='width:110px;' /><br>
	<ul></ul>
</div>

</body>
</html>
