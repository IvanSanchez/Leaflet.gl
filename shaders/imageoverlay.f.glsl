
precision mediump float;

// Receive (interpolated) texture coordinates from vertex shader
varying vec2 vTextureCoords;

uniform sampler2D uTexture;

uniform float uOpacity;

void main(void) {

	lowp vec4 textureColor = texture2D(uTexture, vec2(vTextureCoords.s, vTextureCoords.t));

	// Overwrite alpha (opacity)
// 	textureColor.a = clamp( (uNow - vAge) / 2000.0, 0.0, 1.0);
	textureColor.a *= uOpacity;

	gl_FragColor = textureColor;
// 	gl_FragColor = vec4(0.0, 0.0, 0.0, textureColor.a);

}
