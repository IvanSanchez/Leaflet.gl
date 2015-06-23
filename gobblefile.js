// gobblefile.js
var gobble = require('gobble');

// Roughly equal to gobble([GLSL→JS, nativeJS]).browserify(...)
var concatenatedJs = gobble([
	gobble('shaders').transform('gl2js', {
		format: 'string'
	}),
	gobble('src')
]).transform('include', {
	sourceMap: false
}).transform('concat',{
	dest: 'Leaflet.gl.js',
	files: [
		'core/Browser.js',
		'core/GlUtil.js',
		'Map.js',
		'layer/tile/TileLayer.js'
	]
});

module.exports = gobble([
	concatenatedJs,
	concatenatedJs.transform('uglifyjs', { ext: '.min.js' })
]);

