<?
/**
 * Auto Complete 5.1
 * April 13, 2010
 * Corey Hart @ http://www.codenothing.com
 */ 

// Make request var preg safe
$value = trim($_POST['value']);

// Ensure there is a value to search for
if ((!isset($value) || $value == '') && ! $_POST['all']) exit;

// Get list of random words
$words = explode(',', file_get_contents('words.txt'));

// Set up the send back array
$found = array();
$num = rand(1, 100);
// Search through each standard val and match it if possible
foreach ($words as $word){
	if (!$word || $word == '') continue;
	// If all parameter is passed, load up all C/D values
	if ($_POST['all'] && (($_POST['letter'] == 'c' && strtolower($word[0]) == 'c') || ($_POST['letter'] == 'd' && strtolower($word[0]) == 'd'))){
		// Return Array
		$found[] = array(
			"value" => $word, 
			"display" => "<div style='float:right;'>$num Fake Results</div>$word",
		);
	}
	else if (!$_POST['all'] && strpos($word, $value) === 0){
		// Return Array
		$found[] = array(
			"value" => $word, 
			"display" => "<div style='float:right;'>$num Fake Results</div>$word",
		);
		if (count($found) >= 10)
			break;
	}
}

// JSON encode the array for return
echo json_encode($found);
?>
