
// Tile vertices do not need any special treatment.

attribute vec2 aCRSCoords;
attribute vec2 aTextureCoords;

varying vec2 vTextureCoords;

void main(void) {
	gl_Position = crs2clipspace( vec4(aCRSCoords.x, aCRSCoords.y, 0.0, 1.0));


	vTextureCoords = aTextureCoords;	// Pass the texture coords to the frag shader
}


