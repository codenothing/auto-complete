<?
/**
 * Auto Complete v3.0
 * July 26, 2009
 * Released under the MIT License @ http://www.codenothing.com/license
 * Corey Hart @ http://www.codenothing.com
 */ 

// Request Var
$value = trim($_POST['value']);

// Ensure there is a value to search for
if (!isset($value) || $value == '') exit;

// Get list of random words
$words = explode(',', file_get_contents('words.txt'));

// Set up the send back array
$found = array();
// Search through each standard val and match it if possible
foreach ($words as $word){
	if (preg_match("/^$value/i", $word)){
		// Return Array
		$arr = array(
			// By only passing back the value attribute,
			// it will be defaulted as the display
			"value" => $word,
		);
		array_push($found, $arr);
		if (count($found) >= 10)
			break;
	}
}

// JSON encode the array for return
echo json_encode($found);
?>
