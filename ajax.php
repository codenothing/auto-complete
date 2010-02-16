<?
/**
 * Auto Complete 3.1
 * August 22, 2009
 * Corey Hart @ http://www.codenothing.com
 */ 

// Make request var preg safe
$value = trim($_POST['value']);
$value = str_replace('/', '\/', $value);
$value = str_replace('[', '\[', $value);
$value = str_replace(']', '\]', $value);
$value = str_replace('{', '\{', $value);
$value = str_replace('}', '\}', $value);
$value = str_replace('"', '\"', $value);

// Ensure there is a value to search for
if (!isset($value) || $value == '') exit;

// Get list of random words
$words = explode(',', file_get_contents('words.txt'));

// Set up the send back array
$found = array();
$num = rand(1, 100);
// Search through each standard val and match it if possible
foreach ($words as $word){
	if (!$word || $word == '') continue;
	if (preg_match("/^$value/i", $word)){
		// Return Array
		$arr = array(
			"value" => $word, 
			"display" => "<div style='float:right;'>$num Fake Results</div>$word",
		);
		array_push($found, $arr);
		if (count($found) >= 10)
			break;
	}
}

// JSON encode the array for return
echo json_encode($found);
?>
