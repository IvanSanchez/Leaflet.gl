// Adds WebGL detection to L.Browser.

L.Browser.gl = false;

try {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('webgl');
	if (context && typeof context.getParameter == 'function') {
		L.Browser.gl = 'webgl';
	} else {
		context = canvas.getContext('experimental-webgl');
		if (context && typeof context.getParameter == 'function') {
			L.Browser.gl = 'experimental-webgl';
		}
	}
} catch(e) {}

