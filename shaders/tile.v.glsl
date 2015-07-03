
// Tile vertices do not need any special treatment, just pass stuff along

precision mediump float;

attribute vec3 aCRSCoords;

attribute vec2 aTextureCoords;
varying   vec2 vTextureCoords;

attribute float aAge;
varying   float vAge;


// The layer's tile zoom determines which tiles are shown on top on which.
uniform float uTileZoom;

void main(void) {
	gl_Position = crs2clipspace( vec4(aCRSCoords.x, aCRSCoords.y, 0.0, 1.0));

	// Fake a Z coordinate on every tile so that the correct zoom shows on top
	// TODO: The zoom level of the tile should be in a separate value, as 2.5D tiles
	//  might have a Z coordinate of their own.
	gl_Position.z += abs(aCRSCoords.z - uTileZoom) * 0.00001;

	vTextureCoords = aTextureCoords;	// Pass the texture coords to the frag shader
	vAge = aAge;	// Pass the tile age to the frag shader
}

