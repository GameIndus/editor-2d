<?php
class Database{

	public $db = array();
	public $pdo;

	function __construct(){
		
	}

	public function connect($host, $pseudobdd, $passbdd, $namebdd){
		$this->db = array(
			'host'        => $host,
			'user'        => $pseudobdd,
			'pass'        => $passbdd,
			'database'    => $namebdd
		);

		try {
		    $this->pdo = new PDO('mysql:host='.$this->db['host'].';dbname='.$this->db['database'] , $this->db['user'], $this->db['pass'], array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));
		    $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);
		} catch (PDOException $e) {
		    print "Erreur !: " . $e->getMessage() . "<br/>";
		    die();
		}
	}

	public function find($req = null){
		$sql ='SELECT ';

		if(!empty($req['fields'])){
			$sql .= $req['fields'];
		}else{
			$sql .= '*';
		}

		$sql .= ' FROM ';

		if(!empty($req['table'])){
			$sql .= $req['table'];
		}else{
			return 'Erreur : Aucune table n\'est utilisée !';
		}	

		if(!empty($req['conditions'])){
			$sql .= ' WHERE ';
			$numberOfValues = count($req['conditions']);
			$i = 1;
			foreach ($req['conditions'] as $k => $v) {
				if($i == $numberOfValues){
					$sql .= "$k = '$v' ";
				}else{
					$sql .= "$k = '$v' AND ";
				}
				$i++;
			}
		}	

		if(!empty($req['like'])){
			$sql .= ' WHERE '.$req['likename'].' LIKE "%'.$req['like'].'%" ';
		}	

		if(!empty($req['order'])){
			$sql .= ' ORDER BY '.$req['order'];
		}

		if(!empty($req['limit'])){
			$sql .= ' LIMIT '.$req['limit'];
		}

		// die($sql);
		
		if(isset($this->pdo) && !empty($this->pdo)){
			$pre = $this->pdo->prepare($sql);
		}else{
			return 'Il faut se connecter à la BDD avant de pouvoir utiliser cette fonction !';
		}
		$pre->execute();
		return $pre->fetchAll(PDO::FETCH_OBJ);
	}

	public function findFirst($req = null){
		return current($this->find($req));
	}

	public function save($req = null){
		if(isset($req['insert']) && $req['insert'] == true){
			$sql="INSERT INTO {$req['table']} (";
			$total = count($req['fields']);
			$i = 1;
			foreach ($req['fields'] as $k => $v) {
				if($i == $total){
					$sql .= "$k";
				}else{
					$sql .= "$k,";
				}
				$i++;
			}
			$sql .= ") VALUES (";
			$i2 = 1;
			foreach ($req['fields'] as $k => $v) {
				if($i2 == $total){
					$sql .= "'$v'";
				}else{
					$sql .= "'$v',";
				}
				$i2++;
			}
			$sql .= ")";
			
			$req = $this->pdo->prepare($sql);
	        return $req->execute();
		}else{
			$sql="UPDATE {$req['table']} SET ";
			$total = count($req['fields']);
			$i = 1;
			foreach ($req['fields'] as $k => $v) {
				if($i == $total){
					$sql .= " $k = '$v' ";
				}else{
					$sql .= " $k = '$v', ";
				}
				$i++;
			}
			$sql .= " WHERE {$req['where']} = '{$req['wherevalue']}'";

			$req = $this->pdo->prepare($sql);
	        return $req->execute();
	    }
	}

	public function delete($req = null){
		$sql = "DELETE FROM {$req['table']} WHERE {$req['where']} = '{$req['wherevalue']}'";
		$req = $this->pdo->prepare($sql);
		$req->execute();
	}

	public function count($req = null){
		return count($this->find($req));
	}

	public function req($sql){
		$req = $this->pdo->prepare($sql);
		$req->execute();
		return $req->fetchAll(PDO::FETCH_OBJ);
	} 

	public function escape_string($string){
		return addslashes($string);
	}

	public function getLastID(){
		return $this->pdo->lastInsertId();
	}

}

?>