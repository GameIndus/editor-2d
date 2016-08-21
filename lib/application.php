<?php  
class Application{

	private $DB = null;

	private $project = null;
	private $user    = null;

	private $url = null;


	public function __construct($DB, $uc = false){
		$this->DB = $DB;
		$this->url = dirname($_SERVER["PHP_SELF"]);

		if(!$uc){
			$this->checkUser();
			$this->checkProject();
		}
	}


	public function checkProject(){
		$this->project = (isset($_SESSION["project"]) && !empty($_SESSION["project"]) && $_SESSION["project"] !== true) ? $_SESSION["project"] : $this->DB->findFirst(array('table' => 'projects', 'conditions' => array('id' => $this->getDevProjectId())));

		foreach (preg_split('/,/', $this->project->users_id) as $v) {
			$user  = $this->DB->findFirst(array('table' => 'users', 'conditions' => array('id' => $v)));
			$users[] = $user;
		}

		if(strpos($this->project->users_id, ',') === false) 
			$users = (Object) array('0' => $this->DB->findFirst(array('table' => 'users', 'fields' => "id,username", 'conditions' => array('id' => $this->project->users_id))));

		$this->project->users = $users;
		$_SESSION['project'] = $this->project;

		if($this->isDevelopment() && !isset($_SESSION["user"]->auth)){
			$token = uniqid();

			$_SESSION["user"]->auth = (object) array(
				"token"     => cryptWithKey($token, PUBLIC_AUTH_KEY, PRIVATE_AUTH_KEY),
				"projectId" => $this->project->editor_id
			);

			$this->sendCredentials($token, $this->project->editor_id);
		}
		
		$this->user->auth = $_SESSION["user"]->auth;
	}
	public function checkUser(){
		$user = getUser();

		if($this->isDevelopment() && !$user) redirect("https://gameindus.fr/connexion?n=" . base64_encode("http://" . $_SERVER['HTTP_HOST'] . $this->url . "/"));
		if(empty($user) || $user == null) $this->error("Vous devez vous connecter pour pouvoir accéder à l'éditeur.");
		if(!isAdmin($user) && $this->isDevelopment()){
			redirect("https://gameindus.fr/editor/");
		}

		$this->user = $user;
	}

	public function error($message){
		setNotif($message, "danger");
		redirect("https://gameindus.fr/");

		die();exit();
	}



	public function getProject(){
		return $this->project;
	}
	public function getDevProjectId(){
		if(!isset($_SESSION["dev_project_id"]) || $_SESSION["dev_project_id"] == null){
			redirect($this->url . "/views/cep.php");
			die();
		}

		return $_SESSION["dev_project_id"];
	}
	public function getUser(){
		return $this->user;
	}
	public function isDevelopment(){
		return ($_SERVER['HTTP_HOST'] == "dev.gameindus.fr");
	}


	public function sendCredentials($token, $projectId){
	    $port = 40000;

	    $ch = curl_init();
	    curl_setopt($ch, CURLOPT_URL, 'https://127.0.0.1/');
	    curl_setopt($ch, CURLOPT_HEADER, 0);
	    curl_setopt($ch, CURLOPT_HTTPHEADER, array('blabla'));
	    curl_setopt($ch, CURLOPT_PORT, $port);
	    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
	    curl_setopt($ch, CURLOPT_POST, true);
	    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

	    $data = array('token' => $token, 'projectId' => $projectId);
	    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
	    $ctn = curl_exec($ch);
	    curl_close($ch);
	}

	public function projectIsPremium(){
		$owner = $this->getProject()->owner_id;
		$user  = $this->DB->findFirst(array("table" => "users", "conditions" => array("id" => $owner)));

		if(empty($user)) return false;
		return isPremium($user);
	}

}


function cryptWithKey($data, $key256, $passphrase){
	$cipher = mcrypt_module_open(MCRYPT_RIJNDAEL_128, '', MCRYPT_MODE_CBC, '');
	$iv     = $passphrase;
	 
	mcrypt_generic_init($cipher, $key256, $iv);
	$cipherText256 = mcrypt_generic($cipher, $data);

	mcrypt_generic_deinit($cipher);
	$cipherHexText256 = bin2hex($cipherText256);

	return $cipherHexText256;
}
?>