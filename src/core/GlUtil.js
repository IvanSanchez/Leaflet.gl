// L.GlUtil contains shorthands for common WebGL operations

L.GlUtil = !L.Browser.gl ? {} : {

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
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	},

	// Shorthand for bindBuffer + vertexAttribPointer
	bindBufferToAttrib: function(glContext, buffer, attrib, size, type) {
		glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);

		// attrib index, size, type, normalized (into [-1,1] or [0,1]),
		// stride (when skiping items), pointer (when start at non-zero)
		glContext.vertexAttribPointer(attrib, size, type, false, 0, 0);
	}

};

