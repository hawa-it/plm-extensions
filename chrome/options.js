chrome.storage.sync.get('serverUrl', (data) => {
	if (data.serverUrl) {
		document.getElementById('serverUrl').value = data.serverUrl;
	}
});

document.getElementById('saveButton').addEventListener('click', () => {
	let url = document.getElementById('serverUrl').value;
	if(url.endsWith('/')) {
		do {
			url = url.substr(0, url.length -1);
		} while(url.endsWith('/'));
	}
	document.getElementById('serverUrl').value = url;
	chrome.storage.sync.set({ serverUrl: url }, () => {
		window.close();
	});
});