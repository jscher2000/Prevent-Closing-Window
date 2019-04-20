/* 
  Copyright 2018. Jefferson "jscher2000" Scher. License: MPL-2.0.
  Revision 0.1 - open pinned tab in window to alert on close
  Revision 0.2 - bug fix for slow-opening new windows
  Revision 0.3 - bug fixes
  Revision 0.4 - bug fixes
*/

/**** Create and populate data structure ****/
// Default starting values
let oPrefs = {
	inRegular: true,			// add pinned tab to at least one regular window
	inPrivate: true,			// add pinned tab to at least one private window
	addToEvery: false			// whether to add to one window or all windows
}
// Update oPrefs from storage TODO need to create options page
/*
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
*/

let koTabs = {					// store tabId's of extension tabs
	regTabs: [],
	privTabs: []
};
let regWins = [], privWins = [];	// window id's
let myPage = browser.runtime.getURL('/keepopen.html');

function initKeepOpen(){
	// extension startup: if koTabs is empty, open some pinned tabs
	console.log('Starting initKeepOpen()');
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
	console.log(koTabs);
}
initKeepOpen();
browser.runtime.onStartup.addListener(initKeepOpen);

/* START DISABLED FOR 0.3 

// Listen for window close and update regWins/privWins, regTabs/privTabs
// Create a new pinned tab in another window if needed
browser.windows.onRemoved.addListener((wid) => {
	console.log('Starting windows.onRemoved.addListener() for ' + wid);
	var iTab;
	if (regWins.includes(wid)){
		// remove this window from the regWins array
		regWins.splice(regWins.indexOf(wid), 1);
		if (oPrefs.addToEvery){ // just remove this one from our list
			iTab = koTabs.regTabs.findIndex( oTab => oTab.win_id === wid );
			if (iTab > -1) koTabs.regTabs.splice(iTab, 1);
		} else { // remove this one from our list and create another one
			iTab = koTabs.regTabs.findIndex( oTab => oTab.win_id === wid );
			if (iTab > -1) koTabs.regTabs.splice(iTab, 1);
			if (regWins.length > 0){
				browser.tabs.create({
					url: myPage,
					pinned: false,
					active: true,
					windowId: regWins[0]
				}).then((tabNew) => {
					koTabs.regTabs.push({
						tab_id: tabNew.id,
						win_id: tabNew.windowId
					});
				})
			}
		}
	}
	if (privWins.includes(wid)){
		// remove this window from the privWins array
		privWins.splice(privWins.indexOf(wid), 1);
		if (oPrefs.addToEvery){ // just remove this one from our list
			iTab = koTabs.privTabs.findIndex( oTab => oTab.win_id === wid );
			if (iTab > -1) koTabs.privTabs.splice(iTab, 1);
		} else { // remove this one from our list and create another one
			iTab = koTabs.privTabs.findIndex( oTab => oTab.win_id === wid );
			if (iTab > -1) koTabs.privTabs.splice(iTab, 1);
			if (privWins.length > 0){
				browser.tabs.create({
					url: myPage,
					pinned: false,
					active: true,
					windowId: privWins[0]
				}).then((tabNew) => {
					koTabs.privTabs.push({
						tab_id: tabNew.id,
						win_id: tabNew.windowId
					});
				});
			}
		}
	}
	console.log(koTabs);
});
END DISABLED FOR 0.3 */

// Listen for window created and update regWins/privWins
// Create a new pinned tab in another window if applicable and update regTabs/privTabs
browser.windows.onCreated.addListener((win) => {
	console.log('Starting windows.onCreated.addListener() for ' + win.id);
	// wait for at least one tab to load
	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		console.log('tabs.onUpdated fired');
		if (changeInfo.status == 'complete'){
			if (tab.incognito){
				// add this window to the privWins array
				privWins.push(tab.windowId);
				// do we need to add a pinned tab?
				if (oPrefs.addToEvery || koTabs.privTabs.length === 0){
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
			} else {
				// add this window to the regWins array
				regWins.push(tab.windowId);
				// do we need to add a pinned tab?
				if (oPrefs.addToEvery || koTabs.regTabs.length === 0){
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
}
browser.runtime.onMessage.addListener(handleMessage);
