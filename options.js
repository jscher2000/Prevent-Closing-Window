// Select current option
browser.runtime.sendMessage({
	get: "oPrefs"
}).then((oSettings) => {
	document.getElementById('chkRegular').checked = oSettings.prefs.inRegular;
	document.getElementById('chkPrivate').checked = oSettings.prefs.inPrivate;
	document.getElementById('chkEvery').checked = oSettings.prefs.addToEvery;
}).catch((err) => {
	console.log('Problem getting settings: '+err.message);
});

// Process form clicks
function updatePref(evt){
	// Send preference update
	var oPrefsUpdate = {
		inRegular: document.getElementById('chkRegular').checked,
		inPrivate: document.getElementById('chkPrivate').checked,
		addToEvery: document.getElementById('chkEvery').checked
	};
	// send to background script
	browser.runtime.sendMessage({
		update: oPrefsUpdate
	});
}
// Attach event handlers to checkboxes
document.getElementById('chkRegular').addEventListener('click', updatePref, false);
document.getElementById('chkPrivate').addEventListener('click', updatePref, false);
document.getElementById('chkEvery').addEventListener('click', updatePref, false);
