
// Sprite vertices fake a geometry shader. Each vertex has to be offset
//   by aPixelOffsets to separate the vertices by the needed 
//   amount of pixels.

precision mediump float;

attribute vec3 aCRSCoords;
attribute vec2 aPixelOffset;

attribute vec2 aTextureCoords;
varying   vec2 vTextureCoords;

// uniform vec2 uPixelSize;
uniform vec2 uCanvasSize;

void main(void) {
	vec4 pos = 
	crs2clipspace( vec4(aCRSCoords.x, aCRSCoords.y, aCRSCoords.z, 1.0));
// 	+ vec4(aPixelOffset.x * uPixelSize.x, aPixelOffset.y * uPixelSize.y, 0.0, 0.0);
	//+ 
	//vec4(aPixelOffset.x * uPixelSize.x * 0.0, aPixelOffset.y * uPixelSize.y * 0.0, 0.0, 0.0);

	pos.x += 2.0 * aPixelOffset.x / uCanvasSize.x;
	pos.y += 2.0 * aPixelOffset.y / uCanvasSize.y;

	gl_Position = pos;
	
	vTextureCoords = aTextureCoords;	// Pass the texture coords to the frag shader
}

