/* 
  Copyright 2019. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.1 - open pinned tab in window to alert on close
  version 0.2 - bug fix for slow-opening new windows
  version 0.3 - bug fixes
  version 0.4 - bug fixes
  version 0.5 - tab options other than pinned
  version 0.6 - toolbar button to launch a Keep Open page
  version 0.9 - add options panel
*/

/**** Create and populate data structure ****/
// Default starting values
let oPrefs = {
	inRegular: true,			// add pinned tab to at least one regular window
	inPrivate: true,			// add pinned tab to at least one private window
	addToEvery: false			// whether to add to one window or all windows
}
// Update oPrefs from storage TODO need to create options page
browser.storage.local.get("prefs").then((results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});

let koTabs = {					// store tabId's of extension tabs
	regTabs: [],
	privTabs: []
};
let regWins = [], privWins = [];	// window id's
let myPage = browser.runtime.getURL('/keepopen.html');

function initKeepOpen(){
	// extension startup: if koTabs is empty, open some tabs
	//console.log('Starting initKeepOpen()');
	if (koTabs.regTabs.length === 0 && koTabs.privTabs.length === 0){
		let wins = browser.windows.getAll({populate: true});
		wins.then((arrWins) => {
			for (var i=0; i<arrWins.length; i++){
				if (arrWins[i].incognito) privWins.push(arrWins[i].id);
				else regWins.push(arrWins[i].id);
				if (arrWins[i].focused){
					var wActive = {
						wid: arrWins[i].id,
						incog: arrWins[i].incognito
					};
				}
				// Close restored extension tabs as they seem inert
				for (var j=arrWins[i].tabs.length - 1; j>=0; j--){
					if (arrWins[i].tabs[j].url === myPage){
						if (arrWins[i].tabs.length > 1) browser.tabs.remove(arrWins[i].tabs[j].id);
						else browser.tabs.update(arrWins[i].tabs[j].id,{url: 'about:blank'});
					}
				}
			}
			if (oPrefs.inRegular == true){
				if (oPrefs.addToEvery === false){
					if (wActive.incog === false){
						browser.tabs.create({
							url: myPage,
							pinned: false,
							active: true,
							windowId: wActive.wid
						}).then((tabNew) => {
							koTabs.regTabs.push({
								tab_id: tabNew.id,
								win_id: wActive.wid
							});
						});
					}
				} else {
					for (i=0; i<regWins.length; i++){
						browser.tabs.create({
							url: myPage,
							pinned: false,
							active: true,
							windowId: regWins[i]
						}).then((tabNew) => {
							koTabs.regTabs.push({
								tab_id: tabNew.id,
								win_id: tabNew.windowId
							});
						});
					}
				}
			}
			if (oPrefs.inPrivate == true){
				if (oPrefs.addToEvery === false){
					if (wActive.incog == true){
						browser.tabs.create({
							url: myPage,
							pinned: false,
							active: true,
							windowId: wActive.wid
						}).then((tabNew) => {
							koTabs.privTabs.push({
								tab_id: tabNew.id,
								win_id: wActive.wid
							});
						});
					}
				} else {
					for (i=0; i<privWins.length; i++){
						browser.tabs.create({
							url: myPage,
							pinned: false,
							active: true,
							windowId: privWins[i]
						}).then((tabNew) => {
							koTabs.privTabs.push({
								tab_id: tabNew.id,
								win_id: tabNew.windowId
							});
						});
					}
				}
			}
		});
	}
	//console.log(koTabs);
}
initKeepOpen();
browser.runtime.onStartup.addListener(initKeepOpen);

// Listen for window created and update regWins/privWins
// Create a new pinned tab in another window if applicable and update regTabs/privTabs
browser.windows.onCreated.addListener((win) => {
	console.log('Starting windows.onCreated.addListener() for ' + win.id);
	// wait for at least one tab to load
	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		console.log('tabs.onUpdated fired');
		if (changeInfo.status == 'complete'){
			if (tab.incognito && oPrefs.inPrivate){
				// add this window to the privWins array
				privWins.push(tab.windowId);
				// do we need to add a KO tab?
				if ( (oPrefs.addToEvery && koTabs.privTabs.findIndex( oTab => oTab.win_id === tab.windowId ) === -1 )
					|| koTabs.privTabs.length === 0 ){
					browser.tabs.create({
						url: myPage,
						pinned: false,
						active: true,
						windowId: tab.windowId
					}).then( (tabNew) => {
						koTabs.privTabs.push({
							tab_id: tabNew.id,
							win_id: tabNew.windowId
						});
					});
				}
			} else if (oPrefs.inRegular) {
				// add this window to the regWins array
				regWins.push(tab.windowId);
				// do we need to add a KO tab?
				if ( (oPrefs.addToEvery && koTabs.regTabs.findIndex( oTab => oTab.win_id === tab.windowId ) === -1 )
					|| koTabs.regTabs.length === 0){
					browser.tabs.create({
						url: myPage,
						pinned: false,
						active: true,
						windowId: tab.windowId
					}).then((tabNew) => {
						koTabs.regTabs.push({
							tab_id: tabNew.id,
							win_id: tabNew.windowId
						});
					});
				}
			}
			console.log(koTabs);
		}
	}, {
		windowId: win.id,
		properties: [
			"status"
		]
	});
});

// Message handling
function handleMessage(request, sender, sendResponse) {
	// handler for extension tab being closed
	if ('removed' in request) {
		console.log('Starting handleMessage() for request.removed=' + request.removed);
		if (request.incog){
			iTab = koTabs.privTabs.findIndex( oTab => oTab.tab_id === request.removed );
			if (iTab > -1) koTabs.privTabs.splice(iTab, 1);	
		} else {
			iTab = koTabs.regTabs.findIndex( oTab => oTab.tab_id === request.removed );
			if (iTab > -1) koTabs.regTabs.splice(iTab, 1);
		}
		console.log(koTabs);
	}
	if ("get" in request) {
		// Send oPrefs to Options page
		sendResponse({
			prefs: oPrefs
		});
	} 
	if ("update" in request) {
		// Receive pref update from Options page, store to oPrefs, and commit to storage
		var oSettings = request["update"];
		console.log(oSettings);
		oPrefs.inRegular = oSettings.inRegular;
		oPrefs.inPrivate = oSettings.inPrivate;
		oPrefs.addToEvery = oSettings.addToEvery;
		browser.storage.local.set({prefs: oPrefs})
			.catch((err) => {console.log('Error on browser.storage.local.set(): '+err.message);});
	}
}
browser.runtime.onMessage.addListener(handleMessage);

/**** Set up toolbar button listener ****/

// Listen for button click and open a tab with the Keep Open page
browser.browserAction.onClicked.addListener((currTab) => {
	if (currTab.incognito){
		// add this window to the privWins array
		privWins.push(currTab.windowId);
		// add a KO tab
		browser.tabs.create({
			url: myPage,
			pinned: false,
			active: true,
			windowId: currTab.windowId
		}).then( (tabNew) => {
			koTabs.privTabs.push({
				tab_id: tabNew.id,
				win_id: tabNew.windowId
			});
		});
	} else {
		// add this window to the regWins array
		regWins.push(currTab.windowId);
		// add a KO tab
		browser.tabs.create({
			url: myPage,
			pinned: false,
			active: true,
			windowId: currTab.windowId
		}).then((tabNew) => {
			koTabs.regTabs.push({
				tab_id: tabNew.id,
				win_id: tabNew.windowId
			});
		});
	}
	console.log(koTabs);
});
