<?
/**
 * Auto Complete v2.1
 * June 11, 2009
 * Corey Hart @ http://www.codenothing.com
 *
 * Auto Complete takes input from the user and runs a check through PHP to find what the user
 * is looking for. This test case runs a limited search on words that begin with the letter 'a'.
 */ 

// Request Var
$value = trim($_POST['value']);

// Standard Values to search through
$standard = array(
	"balance" => 47,
	"berries" => 33,
	"bob" => 13,
	"ball" => 06,
	"bowl" => 99,
	"bag" => 41,
	"body" => 31,
);

// Ensure there is a value to search for
if (!isset($value) || $value == '') exit;

// Set up the send back array
$found = array();
// Search through each standard val and match it if possible
foreach ($standard as $item => $num){
	if (preg_match("/^$value/i", $item)){
		// Return Array
		$arr = array(
			"value" => $item, 
			"display" => "<div style='float:right;'>$num Fake Results</div>$item",
		);
		array_push($found, $arr);
	}
}

// JSON encode the array for return
echo json_encode($found);
?>
