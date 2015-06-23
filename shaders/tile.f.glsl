
precision mediump float;

// Receive (interpolated) texture coordinates from vertex shader
varying vec2 vTextureCoords;

// Texture is given as an uniform on a per-tile rendering basis.
uniform sampler2D uTexture;

void main(void) {
// 	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
// 	gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

	gl_FragColor = texture2D(uTexture, vec2(vTextureCoords.s, vTextureCoords.t));

}
