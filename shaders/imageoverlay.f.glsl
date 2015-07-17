
precision mediump float;

// Receive (interpolated) texture coordinates from vertex shader
varying vec2 vTextureCoords;

uniform sampler2D uTexture;

uniform float uOpacity;

void main(void) {

	lowp vec4 textureColor = texture2D(uTexture, vec2(vTextureCoords.s, vTextureCoords.t));

	// Overwrite alpha (opacity)
	textureColor.a *= uOpacity;

	if (textureColor.a < 0.01) {
		discard(foo);	// Should be just "discard;" but glsl-unit chokes on that :-(
	} else {
		gl_FragColor = textureColor;
	}

}
