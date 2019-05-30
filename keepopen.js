// Button handlers
function nounload(evt){
	// unpin the tab and re-enable the button
	browser.tabs.update(myTabId, {
		pinned: false
	});
	document.getElementById('btnPin').removeAttribute('disabled');
	// From: https://developer.mozilla.org/docs/Web/Events/beforeunload#Example
	// Cancel the event as stated by the standard.
	evt.preventDefault();
	// Chrome requires returnValue to be set.
	evt.returnValue = 'Help!';
}

function pinAndActivate(evt){
	// Add "beforeunload" event listener to stop when closing the window
	window.addEventListener('beforeunload', nounload, false);
	switch (evt.target.id){
		case 'btnPin':
			// Pin the tab + activate the previous active tab
			browser.windows.getCurrent({populate: true}).then((win) => {
				// Look up and activate the previously active tab in the window
				win.tabs.sort(function(a,b) {return (b.lastAccessed - a.lastAccessed);});
				browser.tabs.update(win.tabs[1].id, {
					active:true
				}).then(function(){
					// pin the keep open tab
					browser.tabs.update(win.tabs[0].id, {
						pinned: true,
						active: false
					});
				}).then(function(){disableActionButtons();});
			});
			break;
		case 'btnLeft':
			// Change the tab index + activate the previous active tab
			browser.windows.getCurrent({populate: true}).then((win) => {
				// Look up and activate the previously active tab in the window
				win.tabs.sort(function(a,b) {return (b.lastAccessed - a.lastAccessed);});
				browser.tabs.update(win.tabs[1].id, {
					active:true
				}).then(function(){
					// move the keep open tab
					browser.tabs.move(win.tabs[0].id, {
						index: 0
					});
				}).then(function(){disableActionButtons();});
			});
			break;
		case 'btnHere':
			// Just activate the previous active tab
			browser.windows.getCurrent({populate: true}).then((win) => {
				// Look up and activate the previously active tab in the window
				win.tabs.sort(function(a,b) {return (b.lastAccessed - a.lastAccessed);});
				browser.tabs.update(win.tabs[1].id, {
					active:true
				}).then(function(){disableActionButtons();});
			});
	}
}
function disableActionButtons(){
	// Disable the action buttons that triggered this event
	document.getElementById('btnPin').setAttribute('disabled', 'disabled');
	document.getElementById('btnPin').removeEventListener('click', pinAndActivate, false);
	document.getElementById('btnLeft').setAttribute('disabled', 'disabled');
	document.getElementById('btnLeft').removeEventListener('click', pinAndActivate, false);
	document.getElementById('btnHere').setAttribute('disabled', 'disabled');
	document.getElementById('btnHere').removeEventListener('click', pinAndActivate, false);
}
document.getElementById('btnPin').addEventListener('click', pinAndActivate, false);
document.getElementById('btnLeft').addEventListener('click', pinAndActivate, false);
document.getElementById('btnHere').addEventListener('click', pinAndActivate, false);

function closeAndRemove(evt){
	// Turn off protection by closing this tab
	window.removeEventListener('beforeunload', nounload, false);
	browser.windows.getCurrent({populate: true}).then((win) => {
		// Look up and activate the previously active tab in the window
		win.tabs.sort(function(a,b) {return (b.lastAccessed - a.lastAccessed);});
		win.tabs[1].active = true;
		// alert the background script about the closure
		browser.runtime.sendMessage({
			removed: win.tabs[0].id,
			incog: win.incognito
		}).then(function(){
			// close this tab
			browser.tabs.remove(win.tabs[0].id);
		}).catch((err) => {
			console.log('Problem sending message or closing tab: '+err.message);
		});
	});
}
document.getElementById('btnClose').addEventListener('click', closeAndRemove, false);

// Set this up for later
var myTabId = '';
browser.tabs.getCurrent((thisTab) => {
	myTabId = thisTab.id;
});