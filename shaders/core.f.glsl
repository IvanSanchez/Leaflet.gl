
// Defines the varyings available to all subshaders

varying   ivec4 vSubshaderFlags;
varying   vec4 vTextureColor;

uniform sampler2D uTexture;


void main(void) {

	lowp vec4 textureColor;

	if (vSubshaderFlags.x == 1) {	// Tile (textured)

		textureColor = texture2D(uTexture, vec2(vTextureCoords.s, vTextureCoords.t));

		// Overwrite alpha (opacity)
		textureColor.a *= clamp( (uNow - vAge) / fadeInTime, 0.0, 1.0);

		gl_FragColor = textureColor;

	} else if (vSubshaderFlags.y == 2 ) {	// Color
		gl_FragColor = vTextureColor;
	}
}



