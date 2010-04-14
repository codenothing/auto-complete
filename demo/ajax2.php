<?
/**
 * Auto Complete 5.1
 * April 13, 2010
 * Corey Hart @ http://www.codenothing.com
 */ 

// Make request var preg safe
$value = trim($_POST['value']);

// Ensure there is a value to search for
if (!isset($value) || $value == '') exit;

// Get list of random words
$words = explode(',', file_get_contents('words.txt'));

// Set up the send back array
$found = array();
// Search through each standard val and match it if possible
foreach ($words as $word){
	if (strpos($word, $value) === 0){
		// Return Array
		$found[] = array(
			// By only passing back the value attribute,
			// it will be defaulted as the display
			"value" => $word,
		);
		if (count($found) >= 10)
			break;
	}
}

// JSON encode the array for return
echo json_encode($found);
?>
