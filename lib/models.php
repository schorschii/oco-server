<?php
class ComputerCommand {
	public $id;
	public $icon;
	public $name;
	public $command;
}
class Computer {
	public $id;
	public $hostname;
	public $os;
	public $os_version;
	public $kernel_version;
	public $architecture;
	public $cpu;
	public $gpu;
	public $ram;
	public $agent_version;
	public $serial;
	public $manufacturer;
	public $model;
	public $bios_version;
	public $boot_type;
	public $secure_boot;
	public $last_ping;
	public $last_update;
	public $notes;
	public $agent_key;
	// joined software attributes
	public $software_version;
	// joined network attributes
	public $computer_network_mac;
}
class ComputerNetwork {
	public $id;
	public $computer_id;
	public $nic_number;
	public $addr;
	public $netmask;
	public $broadcast;
	public $mac;
	public $domain;
}
class ComputerSoftware {
	public $id;
	public $computer_id;
	public $software_id;
	public $version;
	public $installed;
	// joined software attributes
	public $software_name;
	public $software_description;
}
class ComputerPackage {
	public $id;
	public $computer_id;
	public $package_id;
	public $installed_procedure;
	public $installed;
	// joined computer attributes
	public $computer_hostname;
	// joined package attributes
	public $package_name;
}
class ComputerGroup {
	public $id;
	public $name;
}
class Package {
	public $id;
	public $name;
	public $notes;
	public $version;
	public $author;
	public $install_procedure;
	public $uninstall_procedure;
	public $created;
	// joined package group attributes
	public $package_group_member_sequence;

	public function getFilePath() {
		$path = PACKAGE_PATH.'/'.intval($this->id).'.zip';
		if(!file_exists($path)) return false;
		else return $path;
	}
	public function getSize() {
		$path = $this->getFilePath();
		if(!$path) return false;
		return filesize($path);
	}
}
class PackageGroup {
	public $id;
	public $name;
}
class JobContainer {
	public $id;
	public $name;
	public $start_time;
	public $end_time;
	public $notes;
	public $wol_sent;
	public $created;
	// aggregated values
	public $last_update;
}
class Job {
	public $id;
	public $job_container_id;
	public $computer_id;
	public $package_id;
	public $package_procedure;
	public $is_uninstall;
	public $sequence;
	public $state;
	public $message;
	public $last_update;
	// joined computer attributes
	public $computer_hostname;
	// joined package attributes
	public $package_name;
}
class Domainuser {
	public $id;
	public $username;
	// aggregated values
	public $logon_amount;
	public $computer_amount;
}
class DomainuserLogon {
	public $id;
	public $computer_id;
	public $domainuser_id;
	public $console;
	public $timestamp;
	// aggregated values
	public $logon_amount;
	public $computer_hostname;
	public $domainuser_username;
}
class Systemuser {
	public $id;
	public $username;
	public $fullname;
	public $password;
	public $ldap;
	public $email;
	public $phone;
	public $mobile;
	public $description;
	public $locked;
}
class Software {
	public $id;
	public $name;
	public $description;
	// aggregated values
	public $installations;
}
class Report {
	public $id;
	public $name;
	public $query;
}