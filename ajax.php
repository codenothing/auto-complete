<?
/**
 * Auto Complete
 * June 5, 2009
 * Corey Hart @ http://www.codenothing.com
 *
 * Auto Complete takes input from the user and runs a check through PHP to find what the user
 * is looking for. This test case runs a limited search on words that begin with the letter 'a'.
 */ 

// Request Var
$value = trim($_POST['value']);

// Standard Values to search through
$standard = array(
	"apple" => 42,
	"alcatraz" => 49,
	"aries" => 15,
	"art" => 75,
	"auto-complete" => 67,
	"application" => 91,
	"associate" => 5,
);

// Ensure there is a value to search for
if (!$value || $value == '') exit;

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
