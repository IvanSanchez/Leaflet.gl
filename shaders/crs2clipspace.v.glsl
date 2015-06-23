// Given uniforms for the corner coordinates of the viewport (which are
//   expressed as the center coordinates and offset to the bottom-right corner),
//   expose a function to project CRS coordinates into GL viewport coordinates.
// The Javascript code will be responsible for filling up the uniforms
//   according to the values for center, zoom level and canvas size,
//   and for ensuring that the aspect ratio is the correct one.

/// NOTE: This shader assumes that the CRS space is equirectangular!!!
/// TODO: Implement better transformations for rotation, isometric, perspective.

// uCenter and uHalfViewportSize are uniforms expressed in CRS units.
uniform vec2 uCenter;
uniform vec2 uHalfViewportSize;

vec4 crs2clipspace(vec4 coords) {

	// Reminder: TLBR in clipspace is [+1, -1, -1, +1]
	return vec4(
		(  coords.x - uCenter.x) / uHalfViewportSize.x,
		(- coords.y + uCenter.y) / uHalfViewportSize.y,
		coords[2],
		coords[3]);

}


