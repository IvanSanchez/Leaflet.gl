// L.GlUtil contains shorthands for common WebGL operations

L.GlUtil = {

	createProgram: function(glContext, vertexShaderCode, fragmentShaderCode, attributeNames, uniformNames) {

		var gl = glContext;

		var program = gl.createProgram();
		var vs = gl.createShader(gl.VERTEX_SHADER);
		var fs = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(vs, vertexShaderCode);
		gl.shaderSource(fs, fragmentShaderCode);

		gl.compileShader(vs);
		gl.compileShader(fs);

		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
			throw(new Error(gl.getShaderInfoLog(vs)));
		}
		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
			throw(new Error(gl.getShaderInfoLog(fs)));
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);

		program.attributes = {};
		program.uniforms = {};
		var i, location, name;
		if (attributeNames && attributeNames.length) {
			for (i=0; i<attributeNames.length; i++) {
				name = attributeNames[i];
				location = gl.getAttribLocation(program, name);
				if (location === -1) { throw new Error('Attribute ' + name + ' not found in shaders');}
				program.attributes[name] = location
			}
		}
		if (uniformNames && uniformNames.length) {
			for (i=0; i<uniformNames.length; i++) {
				name = uniformNames[i];
				location = gl.getUniformLocation(program, name);
				if (location === -1) { throw new Error('Uniform ' + name + ' not found in shaders');}
				program.uniforms[name] = location;

			}
		}

		return program;
	},


	// Creates a buffer, inits its data store, and loads initial data into it.
	// mode should be:
	//   gl.STREAM_DRAW for static data used once
	//   gl.STATIC_DRAW for static data (e.g. vector data)
	//   gl.DYNAMIC_DRAW for changing dynamic data (e.g. vertices of loaded tiles)
	initBuffer: function(glContext, initialData, mode) {
		var gl = glContext;
		var buff = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buff);
		gl.bufferData(gl.ARRAY_BUFFER, initialData, mode || gl.STATIC_DRAW);
		return buff;
	},


	// Creates and inits a texture from a **loaded** image (or ready image canvas)
	initTexture: function(glContext, image) {
		var gl = glContext;
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
// 		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
// 		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	},

	// Shorthand for bindBuffer + vertexAttribPointer
	bindBufferToAttrib: function(glContext, buffer, attrib, size, type) {
		glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);

		// attrib index, size, type, normalized (into [-1,1] or [0,1]),
		// stride (when skiping items), pointer (when start at non-zero)
		glContext.vertexAttribPointer(attrib, size, type, false, 0, 0);
	},





	/// TODO: Split matrix stuff into a new L.Matrix4 class, similar to L.Point.
	// Multiply two 4x4 matrices, given as 16-element arrays.
	matrixMultiply: function(a, b) {
		var a00 = a[0*4+0];
		var a01 = a[0*4+1];
		var a02 = a[0*4+2];
		var a03 = a[0*4+3];
		var a10 = a[1*4+0];
		var a11 = a[1*4+1];
		var a12 = a[1*4+2];
		var a13 = a[1*4+3];
		var a20 = a[2*4+0];
		var a21 = a[2*4+1];
		var a22 = a[2*4+2];
		var a23 = a[2*4+3];
		var a30 = a[3*4+0];
		var a31 = a[3*4+1];
		var a32 = a[3*4+2];
		var a33 = a[3*4+3];
		var b00 = b[0*4+0];
		var b01 = b[0*4+1];
		var b02 = b[0*4+2];
		var b03 = b[0*4+3];
		var b10 = b[1*4+0];
		var b11 = b[1*4+1];
		var b12 = b[1*4+2];
		var b13 = b[1*4+3];
		var b20 = b[2*4+0];
		var b21 = b[2*4+1];
		var b22 = b[2*4+2];
		var b23 = b[2*4+3];
		var b30 = b[3*4+0];
		var b31 = b[3*4+1];
		var b32 = b[3*4+2];
		var b33 = b[3*4+3];
		return [a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
		        a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
		        a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
		        a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
		        a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
		        a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
		        a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
		        a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
		        a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
		        a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
		        a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
		        a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
		        a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
		        a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
		        a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
		        a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33];
	},


	// All matrix-returning operations work on 4x4 matrices
	//   expressed as 16-item arrays
	// Returns an identity matrix
	identityMatrix: function() {
		return [
			1,  0,  0,  0,
			0,  1,  0,  0,
			0,  0,  1,  0,
			0,  0,  0,  1
			];
	},


	// Returns a transformation matrix for rotating along the x-axis
	// Theta must be given in radians
	xRotationMatrix: function(theta) {
		var c = Math.cos(theta);
		var s = Math.sin(theta);

		return [
			1,  0,  0,  0,
			0,  c,  s,  0,
			0, -s,  c,  0,
			0,  0,  0,  1
			];
	},

	// Returns a transformation matrix for rotating along the z-axis
	// Theta must be given in radians
	zRotationMatrix: function(theta) {
		var c = Math.cos(theta);
		var s = Math.sin(theta);

		return [
			 c,  s,  0,  0,
			-s,  c,  0,  0,
			 0,  0,  1,  0,
			 0,  0,  0,  1
			];
	},

	// Returns a translation matrix
	// Offset is a 3-element array
	translationMatrix: function(t) {

		return [
			    1,    0,    0,  0,
			    0,    1,    0,  0,
			    0,    0,    1,  0,
			 t[0], t[1], t[2],  1
			];
	},

	// Returns a scale matrix
	// Scale is a 3-element array
	scaleMatrix: function(s) {

		return [
			s[0],    0,    0,  0,
			   0, s[1],    0,  0,
			   0,    0, s[2],  0,
			   0,    0,    0,  1
			];
	},

};

L.glUtil = {};
