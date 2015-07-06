
// The code in L.Map calculates a transform matrix (given the center and
//   size of the viewport, in CRS units). Multiplying the matrix by a
//   CRS coords vector returns a clipspace coords vector.

uniform mat4 uTransformMatrix;

vec4 crs2clipspace(vec4 coords) {

	return coords = uTransformMatrix * coords;

}


