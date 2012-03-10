<?php

include("include.php");
include("imagick_include.php");

function dbFetch($id,$xml)
{ 
  $data = array();
  foreach($xml->attributes() as $key=>$value)
    $data[$key] = (string)$value;
  $result = dbquery("SELECT * FROM cdb WHERE title_id=\"$id\" AND name=\"".$data["name"]."\";");
  while($row = mysql_fetch_array($result))
    $data[$row["key"]] = $row["value"];
  return $data;
}

$page = fopen("im_score.xml","r");
$id = 1;
$contents = stream_get_contents($page);

$canvas = new Imagick();
$canvas->newImage(1920,1080,"none","png");

$xml = new SimpleXMLElement($contents);

foreach($xml->geo->slantRectangle as $slantRectangle)
{
  $sR = dbFetch($id,$slantRectangle);
  slantRectangle($canvas,$sR["x"],$sR["y"],$sR["w"],$sR["h"],$sR["color"]);
}

foreach($xml->overlay->shadowText as $text)
{
  $t = dbFetch($id,$text);
  shadowedText($canvas,$t["x"],$t["y"],$t["w"],$t["h"],$t["text"],$t["gravity"],$t["font"],$t["color"]);
}

foreach($xml->overlay->placeLogo as $logo)
{
  
  $l = dbFetch($id,$logo);
  //print_r($l);
  placeLogo($canvas,$l["x"],$l["y"],$l["w"],$l["h"],$l["path"]);
}

header("Content-Type: image/png");
echo $canvas;

?>