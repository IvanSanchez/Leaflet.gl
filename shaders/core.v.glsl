
// Defines the attributes available to all subshaders

// The generic vertex shader will unpack the subshader+flags int32 into a
//   ivec4 with lots of useless padding.
// I wish that GLSL had proper int8 types and bitwise operators.
attribute int aSubshaderFlags;
varying   ivec4 vSubshaderFlags;

attribute vec3 aCRSCoords;

// Some triangles will have texture
//   (tex S, tex T, texture ID (unused here), tex opacity)
// ... but others will have a color (RGBA).
// Opacity shares the 4th byte of this structure.
attribute vec4 aTextureColor;
varying   vec4 vTextureColor;

// Offset, prev and next alter the geometry and are not
//   needed in the frag shader.
attribute vec3 aOffsetPrev;
attribute vec3 aNext;

// Age impacts opacity. Width impacts geometry. Neither are needed
//   in the frag shaders.
attribute int aAgeWidth;


// Number of milliseconds since the webpage was loaded, needed for timing opacity fading according to the age of the vertex.
uniform int uNow;

// Duration of the tile & image overlay fade-in animation, in milliseconds
#define fadeInTime 200.0


// Takes a int32, returns a vector of 4 int32s containing the
//   corresponding byte, padding the most 3 significative bytes
//   with zeroes.
// Due to the use of multiplication as bit shift, the topmost bit
//   (sign) might be troublesome.
ivec4 unpackFourBytes(int packed) {

	ivec4 ret;

	ret[0] = packed / 256*256*256;
	packed -= ret[0] * 256*256*256;

	ret[1] = packed / 256*256;
	packed -= ret[1] * 256*256;

	ret[2] = packed / 256;
	packed -= ret[2] * 256;

	ret[3] = packed / 256;

	return ret;
}


// The code in L.Map calculates a transform matrix (given the center and
//   size of the viewport, in CRS units). Multiplying the matrix by a
//   CRS coords vector returns a clipspace coords vector.
uniform mat4 uTransformMatrix;

vec4 crs2clipspace(vec4 coords) {

	return coords = uTransformMatrix * coords;

}


// Size of a pixel, in clipspace coordinates. Used for extruding sprites and so.
// Note this is not a hardware pixel, but a CSS pixel.
uniform vec2 uPixelSize;




void main(void) {
	gl_Position = crs2clipspace( vec4(aCRSCoords.xyz, 1.0));

	vSubshaderFlags = unpackFourBytes(aSubshaderFlags);
	vTextureColor = aTextureColor;

	// FIXME: Just an example. In the final implementation, the if-elseif blocks
	//   shall be programatically generated when subshaders are attached.
	if (vSubshaderFlags.x == 1) {	// Tile (textured)

		// Tiles fade-in with their age.
		vTextureColor.a *= clamp( (uNow - aAgeWidth) / fadeInTime, 0.0, 1.0);

	}

}











