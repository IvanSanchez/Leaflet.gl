
var previousMethods = {
	_initLayout: L.Map.prototype._initLayout
};


L.Map.include(!L.Browser.gl ? {} : {

	_initLayout: function() {

		previousMethods._initLayout.call(this);

		var size = this.getSize();
		this._glCanvas = L.DomUtil.create('canvas', 'leaflet-webgl', this._container);
		this._glCanvas.style.width  = size.x + 'px';
		this._glCanvas.style.height = size.y + 'px';	/// TODO: Resize handler
		this._glCanvas.width  = size.x;
		this._glCanvas.height = size.y;	/// TODO: Resize handler
		this._gl = this._glCanvas.getContext(L.Browser.gl);

		this._glLayers = {
			tile: [],
			shadow: [],
			vector: [],
			marker: []
		}

		this._glCreatePrograms();

		this.on('move zoom moveend zoomend', this._glRender, this);

	},



	_glCreatePrograms: function() {

		var gl = this._gl;
		var crs2clipspace = include('crs2clipspace.v.js');

		var tileProgram = L.GlUtil.createProgram(this._gl,
			crs2clipspace + '\n' + include('tile.v.js'),	// Vertex shader
			include('tile.f.js'),	// Fragment shader
			['aCRSCoords', 'aTextureCoords'],	// Attributes
			['uCenter', 'uHalfViewportSize', 'uTexture']	// Uniforms
		);

		this._glPrograms = {
			tile: tileProgram
		};

		this._glBuffers = {
			tileVertices: null
		};

// 		gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffers.tileVertices);
// 		gl.bufferData(gl.ARRAY_BUFFER, demoTile, gl.STATIC_DRAW);
//
// 		this._glBuffers.tileVertices.itemSize = 2;	// Two floats per vertex
// 		this._glBuffers.tileVertices.numItems = 6;	// Six vertices per tile (two triangles)
//

	},


	_glRender: function() {

		var gl = this._gl;

		// Render the scene in several phases, switching shader programs
		//   once per phase:
		// - Tile layers
		// - Marker shadows
		// - Vector data
		// - Markers
		// This mimics the z-index of the panes in 2D mode.
		// A phase will be rendered only when it has at least one layer to
		//   render. Otherwise it's a waste of resources to enable the
		//   shaders for that phase.

		var size = this.getSize();
// 		gl.drawingBufferWidth  = size.x;
// 		gl.drawingBufferHeight = size.y;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
// 		gl.viewport(0, 0, size.x, size.y);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
// 		var halfSize = this.getSize().divideBy(2);

		var projectedCenter = this.options.crs.project(this.getCenter()).round();
		var projectedCorner = this.options.crs.project(this.containerPointToLatLng(this.getSize())).round();
		var halfSize = projectedCorner.subtract(projectedCenter);	// In CRS units


// 		console.log('Triggering render with viewport: ', projectedCenter, halfSize);

		var i;
		if (this._glLayers.tile.length) {

			/// TODO:
			/// - use the tile program
			/// - rebind attribute arrays
			/// - rebind vertex attribute pointers
			/// - rebind uniforms


// 			this._glBuffers.tileVertices.itemSize = 2;	// Two floats per vertex
// 			this._glBuffers.tileVertices.numItems = 6;	// Six vertices per tile (two triangles)

			var program = this._glPrograms.tile;
			gl.useProgram(program);

			gl.uniform2f(program.uniforms.uCenter, projectedCenter.x, projectedCenter.y);
			gl.uniform2f(program.uniforms.uHalfViewportSize, halfSize.x, halfSize.y);
// 			gl.uniform2f(program.uniforms.uCenter, 0.0, 0.0);
// 			gl.uniform2f(program.uniforms.uHalfViewportSize, 2.0, 1.0);

			gl.enableVertexAttribArray(program.attributes.aCRSCoords);
			gl.enableVertexAttribArray(program.attributes.aTextureCoords);


			for (i in this._glLayers.tile) {

				var vertexBuffer = this._glLayers.tile[i].getGlVertexBuffer();

				gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
				gl.vertexAttribPointer(program.attributes.aCRSCoords, 2, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.textureCoordsBuffer);
				gl.vertexAttribPointer(program.attributes.aTextureCoords, 2, gl.FLOAT, false, 0, 0);

				// Render tiles one by one. Bit inefficient, but simpler at
				//   this stage in development.
				for (var j=0; j< vertexBuffer.length; j++) {

					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, vertexBuffer.textures[j*4]);
					gl.uniform1i(program.uniforms.uTexture, 0);

// 					gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexBuffer.length);
					gl.drawArrays(gl.TRIANGLE_STRIP, j*4, 4);
// 					gl.drawArrays(gl.LINE_LOOP, 0, vertexBuffer.length);
// 					gl.drawArrays(gl.LINE_LOOP, j*4, 4);
				}

			}




		}
	}
});



