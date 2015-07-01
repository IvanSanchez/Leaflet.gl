// gobblefile.js
var gobble = require('gobble');

// Roughly equal to gobble([GLSL→JS, nativeJS]).include(...)
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
	'COPYING',
	'core/Browser.js',
	'core/Util.js',
	'core/GlUtil.js',
	'Map.js',
	'layer/tile/TileLayer.js'
	]
});

var uglifiedJs = gobble([
	concatenatedJs,
	concatenatedJs.transform('uglifyjs', { ext: '.min.js' })
]);

module.exports = gobble([
	gobble([uglifiedJs, 'COPYING'])
		.transform('concat', {dest:'Leaflet.gl.js', files: ['COPYING', 'Leaflet.gl.js']}),
	gobble([uglifiedJs, 'COPYING'])
		.transform('concat', {dest:'Leaflet.gl.min.js', files: ['COPYING', 'Leaflet.gl.min.js']})
]);

