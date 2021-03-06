function obj(id) {
	return document.getElementById(id);
}

function handleRefresh(e) {
	if((e.which || e.keyCode) == 116) {
		e.preventDefault();
		refreshContent();
		refreshSidebar();
	}
}

function getCheckedRadioValue(name) {
	var rates = document.getElementsByName(name);
	for(var i = 0; i < rates.length; i++){
		if(rates[i].checked){
			return rates[i].value;
		}
	}
}

function rewriteUrlContentParameter(value) {
	key = encodeURIComponent('explorer-content');
	value = encodeURIComponent(value);
	// kvp looks like ['key1=value1', 'key2=value2', ...]
	var kvp = document.location.search.substr(1).split('&');
	let i=0;
	for(; i<kvp.length; i++) {
		if(kvp[i].startsWith(key + '=')) {
			let pair = kvp[i].split('=');
			pair[1] = value;
			kvp[i] = pair.join('=');
			break;
		}
	}
	if(i >= kvp.length) {
		kvp[kvp.length] = [key,value].join('=');
	}
	let params = kvp.join('&');
	window.history.pushState(currentExplorerContentUrl, "", document.location.pathname+"?"+params);
}
window.onpopstate = function (event) {
	if(event.state != null) {
		// browser's back button pressed
		ajaxRequest(event.state, 'explorer-content', null, false);
	}
};

var currentOpenContextMenu = null;
function toggleContextMenu(menu) {
	if(currentOpenContextMenu != null) {
		currentOpenContextMenu.classList.add('hidden');
	}
	if(menu != null) {
		menu.classList.remove('hidden')
		menu.style.top = event.clientY+'px';
		menu.style.left = event.clientX+'px';
	}
	currentOpenContextMenu = menu;
	return false;
}

function showErrorDialog(active, title='', text='', showReload=true) {
	if(active) {
		obj('dialog-container').classList.add('active');
		obj('dialog-title').innerText = title;
		obj('dialog-text').innerText = text;
		if(showReload) {
			btnDialogHome.style.visibility = 'visible';
			btnDialogReload.style.visibility = 'visible';
		} else {
			btnDialogHome.style.visibility = 'collapse';
			btnDialogReload.style.visibility = 'collapse';
		}
	} else {
		obj('dialog-container').classList.remove('active');
	}
}

var currentExplorerContentUrl = null;
function ajaxRequest(url, objID, callback, addToHistory=true) {
	let timer = null;
	if(objID == 'explorer-content') {
		currentExplorerContentUrl = url;
		showLoader(true);
		timer = setTimeout(function(){ showLoader2(true) }, 100);
	}
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(this.readyState != 4) {
			return;
		}
		if(this.status == 200) {
			if(obj(objID) != null) {
				obj(objID).innerHTML = this.responseText;
				if(objID == 'explorer-content') {
					if(addToHistory) {
						rewriteUrlContentParameter(currentExplorerContentUrl);
					}
					initTableSort()
					initTableSearch()
					clearTimeout(timer);
					showLoader(false);
					showLoader2(false);
					showErrorDialog(false);
				}
			}
			if(callback != undefined && typeof callback == 'function') {
				callback(this.responseText);
			}
		} else if(this.status == 401) {
			window.location.href = 'login.php';
		} else {
			showLoader(false);
			showLoader2(false);
			if(this.status == 0) {
				showErrorDialog(true, L__NO_CONNECTION_TO_SERVER, L__PLEASE_CHECK_NETWORK);
			} else {
				showErrorDialog(true, L__ERROR+' '+this.status+' '+this.statusText, this.responseText);
			}
		}
	};
	xhttp.open("GET", url, true);
	xhttp.send();
}
function ajaxRequestPost(url, body, objID, callback) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(this.readyState == 4 && this.status == 200) {
			if(obj(objID) != null) {
				obj(objID).innerHTML = this.responseText;
				if(objID == 'explorer-content') {
					initTableSort()
					initTableSearch()
				}
			}
			if(callback != undefined && typeof callback == 'function') {
				callback(this.responseText);
			}
		} else if(this.readyState == 4) {
			alert(L__ERROR+' '+this.status+' '+this.statusText+"\n"+this.responseText);
		}
	};
	xhttp.open("POST", url, true);
	xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhttp.send(body);
}
function urlencodeObject(srcjson) {
	if(typeof srcjson !== "object") return null;
	var urljson = "";
	var keys = Object.keys(srcjson);
	for(var i=0; i <keys.length; i++){
		urljson += encodeURIComponent(keys[i]) + "=" + encodeURIComponent(srcjson[keys[i]]);
		if(i < (keys.length-1)) urljson+="&";
	}
	return urljson;
}
function urlencodeArray(src) {
	if(!Array.isArray(src)) return null;
	var urljson = "";
	for(var i=0; i <src.length; i++){
		urljson += encodeURIComponent(src[i]['key']) + "=" + encodeURIComponent(src[i]['value']);
		if(i < (src.length-1)) urljson+="&";
	}
	return urljson;
}

function showLoader(state) {
	if(state) {
		document.body.classList.add('loading');
	} else {
		document.body.classList.remove('loading');
	}
}
function showLoader2(state) {
	if(state) {
		document.body.classList.add('loading2');
	} else {
		document.body.classList.remove('loading2');
	}
}

function getSelectValues(select, except=null) {
	var result = [];
	var options = select && select.options;
	var opt;
	for(var i=0, iLen=options.length; i<iLen; i++) {
		opt = options[i];
		if(opt.selected && opt.value != except) {
			result.push(opt.value || opt.text);
		}
	}
	return result;
}

// auto refresh content
setInterval(refreshSidebar, 10000);

// content refresh functions
function refreshSidebar() {
	ajaxRequest('views/tree.php', 'explorer-tree');
}
function refreshContent() {
	if(currentExplorerContentUrl != null) {
		ajaxRequest(currentExplorerContentUrl, 'explorer-content', null, false);
	}
}
function refreshContentHomepage() {
	ajaxRequest('views/homepage.php', 'explorer-content');
}
function refreshContentSettings(id='') {
	ajaxRequest('views/setting.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentDomainuser() {
	ajaxRequest('views/domainuser.php', 'explorer-content');
}
function refreshContentDomainuserDetail(id) {
	ajaxRequest('views/domainuser-detail.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentComputer(id='') {
	ajaxRequest('views/computer.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentComputerDetail(id) {
	ajaxRequest('views/computer-detail.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentSoftware(id='', version='', os='') {
	ajaxRequest('views/software.php?id='+encodeURIComponent(id)+'&version='+encodeURIComponent(version)+'&os='+encodeURIComponent(os), 'explorer-content');
}
function refreshContentPackage(id='') {
	ajaxRequest('views/package.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentPackageDetail(id) {
	if(id == null) {
		ajaxRequest('views/package-new.php', 'explorer-content');
	} else {
		ajaxRequest('views/package-detail.php?id='+encodeURIComponent(id), 'explorer-content');
	}
}
function refreshContentJobContainer(id='') {
	ajaxRequest('views/job-container.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentDeploy(package_ids=[], package_group_ids=[], computer_ids=[], computer_group_ids=[]) {
	var params = [];
	package_ids.forEach(function(entry) {
		params.push({'key':'package_id[]', 'value':entry});
	});
	package_group_ids.forEach(function(entry) {
		params.push({'key':'package_group_id[]', 'value':entry});
	});
	computer_ids.forEach(function(entry) {
		params.push({'key':'computer_id[]', 'value':entry});
	});
	computer_group_ids.forEach(function(entry) {
		params.push({'key':'computer_group_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequest('views/deploy.php?'+paramString, 'explorer-content', function(){
		refreshDeployComputerAndPackages(sltComputerGroup.value, sltPackageGroup.value, computer_ids, package_ids);
	});
}
function refreshContentReport(id='') {
	ajaxRequest('views/report.php?id='+encodeURIComponent(id), 'explorer-content');
}
function refreshContentReportDetail(id='') {
	ajaxRequest('views/report-detail.php?id='+encodeURIComponent(id), 'explorer-content');
}

// search operation
function doSearch(query) {
	ajaxRequest('views/search.php?query='+encodeURIComponent(query), 'search-results');
	openSearchResults();
}
function closeSearchResults() {
	obj('search-results').style.display = 'none';
	obj('search-glass').classList.remove('focus');
}
function openSearchResults() {
	obj('search-results').style.display = 'block';
	obj('search-glass').classList.add('focus');
}

// package operations
function updatePackageProcedureTemplates() {
	if(fleArchive.files.length > 0) {
		var newOptions = '';
		var i, L = lstInstallProceduresTemplates.options.length - 1;
		for(i = L; i >= 0; i--) {
			newOptions += '<option>'+lstInstallProceduresTemplates.options[i].innerText.replace('[FILENAME]',fleArchive.files[0].name)+'</option>';
		}
		lstInstallProcedures.innerHTML = newOptions;

		var newOptions2 = '';
		var i, L = lstUninstallProceduresTemplates.options.length - 1;
		for(i = L; i >= 0; i--) {
			var fileName = fleArchive.files[0].name;
			if(fileName.endsWith('.deb')) fileName = fileName.replace('.deb', '');
			newOptions2 += '<option>'+lstUninstallProceduresTemplates.options[i].innerText.replace('[FILENAME]',fileName)+'</option>';
		}
		lstUninstallProcedures.innerHTML = newOptions2;
	}
}
function createPackage(name, version, description, archive, install_procedure, install_procedure_success_return_codes, install_procedure_post_action, uninstall_procedure, uninstall_procedure_success_return_codes, download_for_uninstall, uninstall_procedure_post_action, compatible_os, compatible_os_version) {
	if(typeof archive === 'undefined') {
		if(!confirm(L__CONFIRM_CREATE_EMPTY_PACKAGE)) {
			return;
		}
	}

	btnCreatePackage.disabled = true;
	btnCreatePackage.style.display = 'none';
	prgPackageUploadContainer.style.display = 'inline-block';

	let req = new XMLHttpRequest();
	let formData = new FormData();
	formData.append('name', name);
	formData.append('version', version);
	formData.append('description', description);
	formData.append('archive', archive);
	formData.append('install_procedure', install_procedure);
	formData.append('install_procedure_success_return_codes', install_procedure_success_return_codes);
	formData.append('install_procedure_post_action', install_procedure_post_action);
	formData.append('uninstall_procedure', uninstall_procedure);
	formData.append('uninstall_procedure_success_return_codes', uninstall_procedure_success_return_codes);
	formData.append('download_for_uninstall', download_for_uninstall ? '1' : '0');
	formData.append('uninstall_procedure_post_action', uninstall_procedure_post_action);
	formData.append('compatible_os', compatible_os);
	formData.append('compatible_os_version', compatible_os_version);

	req.upload.onprogress = function(evt) {
		if(evt.lengthComputable) {
			var progress = Math.ceil((evt.loaded / evt.total) * 100);
			if(progress == 100) {
				prgPackageUpload.classList.add('animated');
				prgPackageUploadText.innerText = L__IN_PROGRESS;
				prgPackageUpload.style.width = '100%';
			} else {
				prgPackageUpload.classList.remove('animated');
				prgPackageUploadText.innerText = progress + '%';
				prgPackageUpload.style.width = progress + '%';
			}
		} else {
			console.warn('form length is not computable');
			prgPackageUpload.classList.add('animated');
			prgPackageUploadText.innerText = L__IN_PROGRESS;
			prgPackageUpload.style.width = '100%';
		}
	};
	req.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200) {
				alert(L__PACKAGE_CREATED);
				refreshContentPackageDetail(parseInt(this.responseText));
			} else {
				alert(L__ERROR+' '+this.status+' '+this.statusText+"\n"+this.responseText);
				btnCreatePackage.disabled = false;
				btnCreatePackage.style.display = 'inline-block';
				prgPackageUploadContainer.style.display = 'none';
			}
		}
	};

	req.open('POST', 'views/package-new.php');
	req.send(formData);
}
function renamePackageFamily(id, oldValue) {
	var newValue = prompt(L__ENTER_NAME, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_family_id':id, 'update_name':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function removePackageFamilyIcon(id) {
	if(!confirm(L__ARE_YOU_SURE)) {
		return;
	}
	ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_family_id':id, 'remove_icon':1}), null, refreshContent);
}
function editPackageFamilyIcon(id, file) {
	if(file.size/1024/1024 > 2/*MiB*/) {
		alert(L__FILE_TOO_BIG);
		return;
	}

	let req = new XMLHttpRequest();
	let formData = new FormData();
	formData.append('update_package_family_id', id);
	formData.append('update_icon', file);

	req.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200) {
				alert(L__SAVED);
				refreshContent();
			} else {
				alert(L__ERROR+' '+this.status+' '+this.statusText+"\n"+this.responseText);
			}
		}
	};

	req.open('POST', 'views/package-detail.php');
	req.send(formData);
}
function editPackageVersion(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_version':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editPackageInstallProcedure(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_install_procedure':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editPackageInstallProcedureSuccessReturnCodes(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_install_procedure_success_return_codes':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editPackageInstallProcedureAction(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_PROCEDURE_POST_ACTION, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_install_procedure_action':newValue}), null, function(){ refreshContent(); });
	}
}
function editPackageUninstallProcedure(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_uninstall_procedure':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editPackageUninstallProcedureSuccessReturnCodes(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_uninstall_procedure_success_return_codes':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editPackageUninstallProcedureAction(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_PROCEDURE_POST_ACTION, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_uninstall_procedure_action':newValue}), null, refreshContent);
	}
}
function editPackageDownloadForUninstall(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_DOWNLOAD_FOR_UNINSTALL_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_download_for_uninstall':newValue}), null, refreshContent);
	}
}
function editPackageNotes(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_note':newValue}), null, refreshContent);
	}
}
function editPackageCompatibleOs(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_compatible_os':newValue}), null, refreshContent);
	}
}
function editPackageCompatibleOsVersion(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/package-detail.php', urlencodeObject({'update_package_id':id, 'update_compatible_os_version':newValue}), null, refreshContent);
	}
}
function reorderPackageInGroup(groupId, oldPos, newPos) {
	var params = [];
	params.push({'key':'move_in_group', 'value':groupId});
	params.push({'key':'move_from_pos', 'value':oldPos});
	params.push({'key':'move_to_pos', 'value':newPos});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/package.php', paramString, null, refreshContent);
}
function removeSelectedPackage(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmRemovePackage(ids);
}
function confirmRemovePackage(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_PACKAGE)) {
		ajaxRequestPost('views/package.php', paramString, null, refreshContent);
	}
}
function removeSelectedPackageFromGroup(checkboxName, groupId) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	removePackageFromGroup(ids, groupId);
}
function removePackageFromGroup(ids, groupId) {
	var params = [];
	params.push({'key':'remove_from_group_id', 'value':groupId});
	ids.forEach(function(entry) {
		params.push({'key':'remove_from_group_package_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/package.php', paramString, null, refreshContent);
}
function deploySelectedPackage(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	refreshContentDeploy(ids);
}
function newPackageGroup(parent_id=null) {
	var newName = prompt(L__ENTER_NAME);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/package.php', urlencodeObject({'add_group':newName, 'parent_id':parent_id}), null, refreshSidebar);
	}
}
function renamePackageGroup(id, oldName) {
	var newName = prompt(L__ENTER_NAME, oldName);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/package.php', urlencodeObject({'rename_group':id, 'new_name':newName}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function confirmRemovePackageGroup(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_group_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_GROUP)) {
		ajaxRequestPost('views/package.php', paramString, null, function(){ refreshContentPackage(); refreshSidebar(); });
	}
}
function addSelectedPackageToGroup(checkboxName, groupId, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	params.push({'key':'add_to_group_id', 'value':groupId});
	ids.forEach(function(entry) {
		params.push({'key':'add_to_group_package_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/package.php', paramString, null, function() { alert(L__PACKAGES_ADDED) });
}
function addPackageToGroup(packageId, groupId) {
	var params = [];
	params.push({'key':'add_to_group_id', 'value':groupId});
	params.push({'key':'add_to_group_package_id[]', 'value':packageId});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/package.php', paramString, null, function() { alert(L__PACKAGES_ADDED); refreshContent(); });
}
function confirmUninstallPackage(checkboxName, defaultStartTime) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'uninstall_package_assignment_id[]', 'value':entry});
	});
	var startTime = prompt(L__CONFIRM_UNINSTALL_PACKAGE, defaultStartTime);
	if(startTime != null && startTime != '') {
		params.push({'key':'start_time', 'value':startTime});
		var paramString = urlencodeArray(params);
		ajaxRequestPost('views/computer-detail.php', paramString, null, function() { refreshSidebar(); refreshContent(); });
	}
}
function confirmRemovePackageComputerAssignment(checkboxName) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_package_assignment_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_REMOVE_PACKAGE_ASSIGNMENT)) {
		ajaxRequestPost('views/computer-detail.php', paramString, null, function() { refreshContent() });
	}
}
function refreshDeployComputerAndPackages(refreshComputersGroupId=null, refreshPackagesGroupId=null, preselectComputerIds=[], preselectPackageIds=[]) {
	if(refreshComputersGroupId != null) {
		var params = [];
		params.push({'key':'get_computer_group_members', 'value':refreshComputersGroupId});
		preselectComputerIds.forEach(function(entry) {
			params.push({'key':'computer_id[]', 'value':entry});
		});
		ajaxRequest("views/deploy.php?"+urlencodeArray(params), 'sltComputer', function(){ refreshDeployCount() });
		if(refreshComputersGroupId < 1) sltComputerGroup.value = -1;
	}
	if(refreshPackagesGroupId != null) {
		var params = [];
		params.push({'key':'get_package_group_members', 'value':refreshPackagesGroupId});
		preselectPackageIds.forEach(function(entry) {
			params.push({'key':'package_id[]', 'value':entry});
		});
		ajaxRequest("views/deploy.php?"+urlencodeArray(params), 'sltPackage', function(){ refreshDeployCount() });
		if(refreshPackagesGroupId < 1) sltPackageGroup.value = -1;
	}
}
function refreshDeployCount() {
	spnSelectedComputers.innerHTML = getSelectValues(sltComputer).length;
	spnSelectedPackages.innerHTML = getSelectValues(sltPackage).length;
	spnTotalComputers.innerHTML = sltComputer.options.length;
	spnTotalPackages.innerHTML = sltPackage.options.length;

	let computerGroupCount = getSelectValues(sltComputerGroup, -1).length;
	let packageGroupCount = getSelectValues(sltPackageGroup, -1).length;

	// computer ids have priority - if only one group is selected, we evaluate the selected computers instead of the whole group
	if(computerGroupCount == 1) spnSelectedComputerGroups.innerHTML = '0';
	else spnSelectedComputerGroups.innerHTML = computerGroupCount;

	// package ids have priority - if only one group is selected, we evaluate the selected packages instead of the whole group
	if(packageGroupCount == 1) spnSelectedPackageGroups.innerHTML = '0';
	else spnSelectedPackageGroups.innerHTML = packageGroupCount;

	spnTotalComputerGroups.innerHTML = sltComputerGroup.options.length;
	spnTotalPackageGroups.innerHTML = sltPackageGroup.options.length;
}

// computer operations
function editComputerNotes(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/computer-detail.php', urlencodeObject({'update_note_computer_id':id, 'update_note':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function newComputer() {
	var newName = prompt(L__ENTER_NAME);
	if(newName != null && newName != '') {
		let req = new XMLHttpRequest();
		let formData = new FormData();
		formData.append('add_computer', newName);
		req.onreadystatechange = function() {
			if(this.readyState == 4) {
				if(this.status == 200) {
					refreshContentComputerDetail(parseInt(this.responseText));
				} else {
					alert(L__ERROR+' '+this.status+' '+this.statusText+"\n"+this.responseText);
				}
			}
		};
		req.open('POST', 'views/computer.php');
		req.send(formData);
	}
}
function removeSelectedComputerFromGroup(checkboxName, groupId) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	removeComputerFromGroup(ids, groupId);
}
function removeComputerFromGroup(ids, groupId) {
	var params = [];
	params.push({'key':'remove_from_group_id', 'value':groupId});
	ids.forEach(function(entry) {
		params.push({'key':'remove_from_group_computer_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/computer.php', paramString, null, refreshContent);
}
function removeSelectedComputer(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmRemoveComputer(ids);
}
function confirmRemoveComputer(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE)) {
		ajaxRequestPost('views/computer.php', paramString, null, refreshContent);
	}
}
function deploySelectedComputer(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	refreshContentDeploy([],[],ids);
}
function wolSelectedComputer(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmWolComputer(ids);
}
function renameComputer(id, oldName) {
	var newName = prompt(L__ENTER_NEW_HOSTNAME, oldName);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/computer-detail.php', urlencodeObject({'rename_computer_id':id, 'new_name':newName}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function confirmWolComputer(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'wol_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/computer.php', paramString, null, function() { alert(L__WOL_SENT) });
}
function newComputerGroup(parent_id=null) {
	var newName = prompt(L__ENTER_NAME);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/computer.php', urlencodeObject({'add_group':newName, 'parent_id':parent_id}), null, refreshSidebar);
	}
}
function renameComputerGroup(id, oldName) {
	var newName = prompt(L__ENTER_NAME, oldName);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/computer.php', urlencodeObject({'rename_group':id, 'new_name':newName}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function confirmRemoveComputerGroup(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_group_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_GROUP)) {
		ajaxRequestPost('views/computer.php', paramString, null, function(){ refreshContentComputer(); refreshSidebar(); });
	}
}
function addSelectedComputerToGroup(checkboxName, groupId, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	params.push({'key':'add_to_group_id', 'value':groupId});
	ids.forEach(function(entry) {
		params.push({'key':'add_to_group_computer_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/computer.php', paramString, null, function() { alert(L__COMPUTER_ADDED) });
}
function addComputerToGroup(computerId, groupId) {
	var params = [];
	params.push({'key':'add_to_group_id', 'value':groupId});
	params.push({'key':'add_to_group_computer_id[]', 'value':computerId});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/computer.php', paramString, null, function() { alert(L__COMPUTER_ADDED); refreshContent(); });
}

// job operations
function removeSelectedJobContainer(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmRemoveJobContainer(ids);
}
function confirmRemoveJobContainer(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_container_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_JOBCONTAINER)) {
		ajaxRequestPost('views/job-container.php', paramString, null, function(){ refreshContentJobContainer(); refreshSidebar(); });
	}
}
function removeSelectedJob(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmRemoveJob(ids);
}
function confirmRemoveJob(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_job_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_JOB)) {
		ajaxRequestPost('views/job-container.php', paramString, null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function confirmRenewFailedJobsInContainer(id, defaultStartTime) {
	if(!confirm(L__CONFIRM_RENEW_JOBS)) { return; }
	var startTime = prompt(L__ENTER_START_TIME, defaultStartTime);
	if(startTime == null || startTime == '') { return; }
	ajaxRequestPost('views/job-container.php', urlencodeObject({'renew_container_id':id, 'renew_start_time':startTime}), null, function(){ refreshContent(); refreshSidebar(); });
}
function renameJobContainer(id, oldName) {
	var newName = prompt(L__ENTER_NAME, oldName);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/job-container.php', urlencodeObject({'edit_container_id':id, 'new_name':newName}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editJobContainerStart(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/job-container.php', urlencodeObject({'edit_container_id':id, 'new_start':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editJobContainerEnd(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/job-container.php', urlencodeObject({'edit_container_id':id, 'new_end':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function editJobContainerNotes(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/job-container.php', urlencodeObject({'edit_container_id':id, 'new_notes':newValue}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function deploy(title, start, end, description, sltComputer, sltComputerGroup, sltPackage, sltPackageGroup, useWol, autoCreateUninstallJobs, restartTimeout) {
	btnDeploy.disabled = true;
	let req = new XMLHttpRequest();
	let formData = new FormData();
	formData.append('add_jobcontainer', title);
	formData.append('date_start', start);
	formData.append('date_end', end);
	formData.append('description', description);
	formData.append('use_wol', useWol ? 1 : 0);
	formData.append('auto_create_uninstall_jobs', autoCreateUninstallJobs ? 1 : 0);
	formData.append('restart_timeout', restartTimeout);
	getSelectValues(sltPackage).forEach(function(entry) {
		formData.append('package_id[]', entry);
	});
	getSelectValues(sltPackageGroup).forEach(function(entry) {
		formData.append('package_group_id[]', entry);
	});
	getSelectValues(sltComputer).forEach(function(entry) {
		formData.append('computer_id[]', entry);
	});
	getSelectValues(sltComputerGroup).forEach(function(entry) {
		formData.append('computer_group_id[]', entry);
	});
	req.open('POST', 'views/deploy.php');
	req.send(formData);
	req.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200) {
				refreshContentJobContainer(parseInt(this.responseText));
				refreshSidebar();
			} else {
				alert(L__ERROR+' '+this.status+' '+this.statusText+"\n"+this.responseText);
				btnDeploy.disabled = false;
			}
		}
	};
}

// domainuser operations
function confirmRemoveSelectedDomainuser(checkboxName) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE)) {
		ajaxRequestPost('views/domainuser.php', paramString, null, refreshContent);
	}
}

// report operations
function newReportGroup(parent_id=null) {
	var newName = prompt(L__ENTER_NAME);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/report.php', urlencodeObject({'add_group':newName, 'parent_id':parent_id}), null, refreshSidebar);
	}
}
function renameReportGroup(id, oldName) {
	var newName = prompt(L__ENTER_NAME, oldName);
	if(newName != null && newName != '') {
		ajaxRequestPost('views/report.php', urlencodeObject({'rename_group':id, 'new_name':newName}), null, function(){ refreshContent(); refreshSidebar(); });
	}
}
function confirmRemoveReportGroup(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_group_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE_GROUP)) {
		ajaxRequestPost('views/report.php', paramString, null, function(){ refreshContentReport(); refreshSidebar(); });
	}
}
function newReport(group_id=0) {
	var newName = prompt(L__ENTER_NAME);
	if(newName != null && newName != '') {
		var newQuery = prompt(L__ENTER_QUERY);
		if(newQuery != null && newQuery != '') {
			ajaxRequestPost('views/report.php', urlencodeObject({'add_report':newName, 'query':newQuery, 'group_id':group_id}), null, refreshContent);
		}
	}
}
function renameReport(id, oldValue) {
	var newValue = prompt(L__ENTER_NAME, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/report-detail.php', urlencodeObject({'update_report_id':id, 'update_name':newValue}), null, refreshContent);
	}
}
function editReportNote(id, oldValue) {
	var newValue = prompt(L__ENTER_NEW_VALUE, oldValue);
	if(newValue != null) {
		ajaxRequestPost('views/report-detail.php', urlencodeObject({'update_report_id':id, 'update_note':newValue}), null, refreshContent);
	}
}
function editReportQuery(id, oldValue) {
	var newValue = prompt(L__ENTER_QUERY, oldValue);
	if(newValue != null && newValue != '') {
		ajaxRequestPost('views/report-detail.php', urlencodeObject({'update_report_id':id, 'update_query':newValue}), null, refreshContent);
	}
}
function removeSelectedReport(checkboxName, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	confirmRemoveReport(ids);
}
function confirmRemoveReport(ids) {
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE)) {
		ajaxRequestPost('views/report.php', paramString, null, refreshContent);
	}
}
function moveSelectedReportToGroup(checkboxName, groupId, attributeName=null) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			if(attributeName == null) {
				ids.push(entry.value);
			} else {
				ids.push(entry.getAttribute(attributeName));
			}
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	params.push({'key':'move_to_group_id', 'value':groupId});
	ids.forEach(function(entry) {
		params.push({'key':'move_to_group_report_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/report.php', paramString, null, function() { refreshContent(); alert(L__SAVED); });
}

// systemuser operations
function confirmRemoveSelectedSystemuser(checkboxName) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'remove_systemuser_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	if(confirm(L__CONFIRM_DELETE)) {
		ajaxRequestPost('views/setting.php', paramString, null, refreshContent);
	}
}
function lockSelectedSystemuser(checkboxName) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'lock_systemuser_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/setting.php', paramString, null, refreshContent);
}
function unlockSelectedSystemuser(checkboxName) {
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	var params = [];
	ids.forEach(function(entry) {
		params.push({'key':'unlock_systemuser_id[]', 'value':entry});
	});
	var paramString = urlencodeArray(params);
	ajaxRequestPost('views/setting.php', paramString, null, refreshContent);
}
function createSystemuser(username, fullname, password) {
	btnCreateUser.disabled = true;
	let req = new XMLHttpRequest();
	let formData = new FormData();
	formData.append('add_systemuser_username', username);
	formData.append('add_systemuser_fullname', username);
	formData.append('add_systemuser_password', password);
	req.open('POST', 'views/setting.php');
	req.send(formData);
	req.onreadystatechange = function() {
		if(this.readyState == 4 && this.status == 200) {
			refreshContent();
		}
	};
}
function changeSelectedSystemuserPassword(checkboxName, password, password2) {
	if(password != password2) {
		alert(L__PASSWORDS_DO_NOT_MATCH);
		return;
	}
	var ids = [];
	document.getElementsByName(checkboxName).forEach(function(entry) {
		if(entry.checked) {
			ids.push(entry.value);
		}
	});
	if(ids.length == 0) {
		alert(L__NO_ELEMENTS_SELECTED);
		return;
	}
	btnChangePassword.disabled = true;
	let req = new XMLHttpRequest();
	let formData = new FormData();
	formData.append('change_systemuser_id', ids[0]);
	formData.append('change_systemuser_password', password);
	req.open('POST', 'views/setting.php');
	req.send(formData);
	req.onreadystatechange = function() {
		if(this.readyState == 4 && this.status == 200) {
			alert(L__SAVED);
			refreshContent();
		}
	};
}

// setting operations
function saveGeneralSettings() {
	btnSaveGeneralSettings.disabled = true;
	var values = {
		"agent-registration-enabled": chkAgentRegistrationEnabled.checked ? 1 : 0,
		"agent-key": txtAgentKey.value,
		"agent-update-interval": txtAgentUpdateInterval.value,
		"purge-succeeded-jobs": txtPurgeSucceededJobsAfter.value,
		"purge-failed-jobs": txtPurgeFailedJobsAfter.value
	};
	ajaxRequestPost('views/setting.php', urlencodeObject(values), null, function(){ alert(L__SAVED); refreshContent(); });
}
