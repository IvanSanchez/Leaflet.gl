
precision mediump float;

// Receive (interpolated) texture coordinates from vertex shader
varying vec2 vTextureCoords;

// Receive tile age from vertex shader
varying float vAge;

// Texture is given as an uniform on a per-tile rendering basis.
uniform sampler2D uTexture;

// Number of milliseconds since the webpage was loaded, needed for timing opacity fading.
uniform float uNow;

// Duration of the tile fade-in animation, in milliseconds
#define fadeInTime 500.0

void main(void) {
// 	gl_FragColor = vec4(0.0, 0.0, 0.0, 0.5);
// 	gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

	lowp vec4 textureColor = texture2D(uTexture, vec2(vTextureCoords.s, vTextureCoords.t));

	// Overwrite alpha (opacity)
// 	textureColor.a = clamp( (uNow - vAge) / 2000.0, 0.0, 1.0);
	textureColor.a *= clamp( (uNow - vAge) / fadeInTime, 0.0, 1.0);

	gl_FragColor = textureColor;
}
