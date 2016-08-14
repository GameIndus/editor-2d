<?php  
ini_set('session.cookie_domain', '.gameindus.fr');
session_start();

error_reporting(E_ALL);
ini_set("display_errors", 1);
date_default_timezone_set('Europe/Paris');
setlocale (LC_TIME, 'fr_FR.utf8','fra');
ini_set('memory_limit', '-1'); 

require_once 'config.php';
require_once '/home/gameindus/site/core/functions.php';
require_once 'Database.php';
require_once 'application.php';

// Init Database
$DB = new Database();
$DB->connect(DB_HOST, DB_USER, DB_PASS, DB_BDD);
?>