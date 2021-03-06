<?php
require_once('../lib/Loader.php');

// check content type
if(!isset($_SERVER['CONTENT_TYPE']) || $_SERVER['CONTENT_TYPE'] != 'application/json') {
	header('HTTP/1.1 400 Content Type Mismatch'); die();
}

// get body
$body = file_get_contents('php://input');
$srcdata = json_decode($body, true);

// validate JSON-RPC
if($srcdata === null || !isset($srcdata['jsonrpc']) || $srcdata['jsonrpc'] != '2.0' || !isset($srcdata['method']) || !isset($srcdata['params']) || !isset($srcdata['id'])) {
	header('HTTP/1.1 400 Payload Corrupt'); die();
}

$resdata = ['id' => $srcdata['id']];
$params = $srcdata['params'];
switch($srcdata['method']) {
	case 'oco.update_deploy_status':
		$data = $params['data'];

		// check parameter
		if(!isset($data['job-id']) || !isset($data['state']) || !isset($data['return-code']) || !isset($data['message'])) {
			header('HTTP/1.1 400 Parameter Mismatch'); die();
		}

		// check authorization
		$computer = $db->getComputerByName($params['hostname']);
		if($params['agent-key'] !== $computer->agent_key) {
			authErrorExit();
		}

		// get job details
		$state = $data['state'];
		$job = $db->getJob($data['job-id']);
		if($job === null) {
			header('HTTP/1.1 400 Job Not Found'); die();
		}

		// if job finished, we need to check the return code
		if($state == Job::STATUS_SUCCEEDED) {
			$successCodes = [];
			foreach(explode(',', $job->success_return_codes) as $successCode) {
				if(trim($successCode) === '') continue;
				$successCodes[] = intval(trim($successCode));
			}
			// check if return code is a success return code if any valid return code found
			if(count($successCodes) > 0) {
				$state = Job::STATUS_FAILED;
				foreach($successCodes as $successCode) {
					if(intval($data['return-code']) === intval($successCode)) {
						$state = Job::STATUS_SUCCEEDED;
						break;
					}
				}
			}
		}

		// update job state in database
		$db->updateJobState($data['job-id'], $state, intval($data['return-code']), $data['message']);
		// update computer-package assignment if job was successful
		if($state === Job::STATUS_SUCCEEDED) {
			if($job->is_uninstall == 0) {
				$db->addPackageToComputer($job->package_id, $job->computer_id, $job->package_procedure);
			} elseif($job->is_uninstall == 1) {
				$db->removeComputerAssignedPackageByIds($job->computer_id, $job->package_id);
			}
		}
		$resdata['error'] = null;
		$resdata['result'] = [
			'success' => true,
			'params' => [
				'server-key' => $computer->server_key,
			]
		];
		break;

	case 'oco.agent_hello':
		$data = $params['data'];
		$computer = $db->getComputerByName($params['hostname']);
		$jobs = []; $update = 0; $server_key = null; $agent_key = null; $success = false;

		if($computer == null) {
			if($params['agent-key'] !== $db->getSettingByName('agent-key')) {
				authErrorExit();
			}

			if($db->getSettingByName('agent-registration-enabled') == '1') {
				$server_key = randomString();
				$agent_key = randomString();
				$update = 1;
				if($db->addComputer(
					$params['hostname'],
					$data['agent_version'],
					$data['networks'],
					LANG['self_registration'].' '.date('Y-m-d H:i:s'),
					$agent_key,
					$server_key
				)) {
					$success = true;
				}
			} else {
				header('HTTP/1.1 403 Client Self-Registration Disabled'); die();
			}
		} else {
			if(empty($computer->agent_key)) {
				// computer was pre-registered in the web frontend: check global key and generate individual key
				if($params['agent-key'] !== $db->getSettingByName('agent-key')) {
					authErrorExit();
				} else {
					$agent_key = randomString();
					$db->updateComputerAgentkey($computer->id, $agent_key);
				}
			} else {
				// check individual agent key
				if($params['agent-key'] !== $computer->agent_key) {
					authErrorExit();
				}
			}

			if(empty($computer->server_key)) {
				// generate a server key if empty
				$server_key = randomString();
				$db->updateComputerServerkey($computer->id, $server_key);
			} else {
				// get the current server key for the agent
				$server_key = $computer->server_key;
			}

			// update last seen date
			$db->updateComputerPing($computer->id);

			// check if agent should update inventory data
			if(time() - strtotime($computer->last_update) > $db->getSettingByName('agent-update-interval')) {
				$update = 1;
			}

			// get pending jobs
			foreach($db->getPendingJobsForComputer($computer->id) as $pj) {
				$restart = null; $shutdown = null; $exit = null;
				if($pj['post_action'] == Package::POST_ACTION_RESTART)
					$restart = intval($pj['post_action_timeout'] ?? 1);
				if($pj['post_action'] == Package::POST_ACTION_SHUTDOWN)
					$shutdown = intval($pj['post_action_timeout'] ?? 1);
				if($pj['post_action'] == Package::POST_ACTION_EXIT)
					$exit = intval($pj['post_action_timeout'] ?? 1);
				$jobs[] = [
					'id' => $pj['id'],
					'package-id' => $pj['package_id'],
					'download' => $pj['download']==0 ? False : True,
					'procedure' => $pj['procedure'],
					'restart' => $restart,
					'shutdown' => $shutdown,
					'exit' => $exit,
				];
			}

			$success = true;
		}

		$resdata['error'] = null;
		$resdata['result'] = [
			'success' => $success,
			'params' => [
				'server-key' => $server_key, // tell the agent our server key, so it can validate the server
				'agent-key' => $agent_key,   // tell the agent that it should save a new agent key for further requests
				'update' => $update,         // tell the agent that it should update the inventory data
				'software-jobs' => $jobs,    // tell the agent all pending software jobs
			]
		];

		break;

		case 'oco.agent_update':
			$data = $params['data'];
			$computer = $db->getComputerByName($params['hostname']);
			if($params['agent-key'] !== $computer->agent_key) {
				authErrorExit();
			}

			$success = false;
			if($computer !== null) {
				$success = true;
				$db->updateComputerPing($computer->id);
				if(time() - strtotime($computer->last_update) > $db->getSettingByName('agent-update-interval')
				&& !empty($data)) {
					// convert login timestamps to local time,
					// because other timestamps in the database are also in local time
					$logins = [];
					if(!empty($data['logins'])) foreach($data['logins'] as $login) {
						try {
							$date = new DateTime($login['timestamp'], new DateTimeZone('UTC'));
							$date->setTimezone(new DateTimeZone(date_default_timezone_get()));
							$logins[] = [
								'username' => $login['username'],
								'console' => $login['console'],
								'timestamp' => $date->format('Y-m-d H:i:s'),
							];
						} catch(Exception $e) {}
					}
					// update inventory data now
					$db->updateComputer(
						$computer->id,
						$params['hostname'],
						$data['os'],
						$data['os_version'],
						$data['os_license'] ?? '-',
						$data['os_language'] ?? '-',
						$data['kernel_version'],
						$data['architecture'],
						$data['cpu'],
						$data['gpu'],
						$data['ram'],
						$data['agent_version'],
						$data['serial'],
						$data['manufacturer'],
						$data['model'],
						$data['bios_version'],
						$data['boot_type'],
						$data['secure_boot'],
						$data['domain'] ?? '',
						$data['networks'] ?? [],
						$data['screens'] ?? [],
						$data['printers'] ?? [],
						$data['partitions'] ?? [],
						$data['software'] ?? [],
						$logins
					);
				}
			}

			$resdata['error'] = null;
			$resdata['result'] = [
				'success' => $success,
				'params' => [
					'server-key' => $computer->server_key,
				]
			];

			break;

	default:
		$resdata['result'] = null;
		$resdata['error'] = 'Unknown Method';
}

// return response
header('Content-Type: application/json');
echo json_encode($resdata);


function authErrorExit() {
	header('HTTP/1.1 401 Client Not Authorized');
	error_log('api-agent: authentication failure');
	die();
}
