// L.TileLayer modifies the behaviour of all tilelayers to use WebGL
//   to render themselves.

(function(){

	var tileLayerProto = L.extend({}, L.TileLayer.prototype);

	L.TileLayer.addInitHook(function(){
		// Cross-origin stuff needed for images to be loaded into textures.
		// If the tileserver does not allow CORS, tiles cannot be loaded into
		//   a canvas or a WebGL texture.
		this.options.crossOrigin = true;
	});


	L.TileLayer.include({

		onAdd: function(map) {
			tileLayerProto.onAdd.call(this, map);

			// Tell the map we'll be using a GL program to render ourselves, instead of
			//   a map pane.
			// Programs are reused between layers which share a program with the same
			//   name.
			map.registerGlProgram('tile', 1,
				include('tile.v.js'),	// Vertex shader
				include('tile.f.js'),	// Fragment (pixel) shader
				['aCRSCoords', 'aTextureCoords', 'aAge'],	// Attributes
				['uNow', 'uTexture', 'uTileZoom']	// Uniforms
			);
			map.attachLayerToGlProgram(this, 'tile');
		},

		onRemove: function(map) {
			tileLayerProto.onRemove.call(this, map);

			map.detachLayerFromGlProgram(this, 'tile');
		},

		// Prevent creating an element and adding it to a map pane by doing nothing here.
		_initContainer: function() {},


		// When the underlying image is done, create triangles
		//   and add texture.
		_tileReady: function(tileCoords, err, tile) {
			if (!this._map) { return; }

			if (err) {
				this.fire('tileerror', {
					error: err,
					tile: tile,
					coords: coords
				});
			}

			var key = this._tileCoordsToKey(tileCoords);

			tile = this._tiles[key];
			if (!tile) { return; }

			// Pack data from this tile into a low-level array, which will
			//   later form an interleaved array buffer.
			// A tile is two triangles in a triangle strip, defined by 4 vertices.
			// Each vertex has 3 coordinates, two texture coordinates, one age.
			tile.glData = new Float32Array(24);
			tile.age = performance.now();

			var crsCoords = this._tileCoordsToProjectedBounds(tileCoords);
			var tileZoom = tile.coords.z;

			tile.glData.set([
				crsCoords.min.x, crsCoords.min.y, tileZoom,
				0, 1,
				tile.age,

				crsCoords.max.x, crsCoords.min.y, tileZoom,
				1, 1,
				tile.age,

				crsCoords.min.x, crsCoords.max.y, tileZoom,
				0, 0,
				tile.age,

				crsCoords.max.x, crsCoords.max.y, tileZoom,
				1, 0,
				tile.age
			]);

			tile.texture = L.GlUtil.initTexture(this._map.getGlContext(), tile.el);

			this.fire('tileload', {
				tile: tile.el,
				coords: tileCoords
			});

			if (this._noTilesToLoad()) {
				this._loading = false;
				this.fire('load');
			}

			// The fade-in animation will run for 500 milliseconds, as coded in
			//   the fragment shader.
			this._map.glRenderUntil(500);
		},


		// A light version of _tileCoordsToBounds, which doesn't unproject
		//   the map's CRS to LatLng.
		_tileCoordsToProjectedBounds: function(coords) {

			var map = this._map,
				crs = map.options.crs,
				transformation = crs.transformation,
				tileSize = this._getTileSize(),
				scale = crs.scale(coords.z),
				nwPoint = coords.multiplyBy(tileSize),
				sePoint = nwPoint.add([tileSize, tileSize]);

			nwPoint = transformation.untransform(nwPoint, scale);
			sePoint = transformation.untransform(sePoint, scale);

			return new L.Bounds(nwPoint, sePoint);
		},

		_removeTile: function (key) {
			var tile = this._tiles[key];
			if (!tile) { return; }

// 			console.log('remove ', key, performance.now());
			window.setTimeout(function(){
				// Wait a bit until other tiles have faded in
				this._map.getGlContext().deleteTexture(tile.texture);
				delete this._tiles[key];
			}.bind(this), 500);

			this.fire('tileunload', {
				tile: tile.el,
				coords: this._keyToTileCoords(key)
			});
		},

		_invalidateGlVertexBuffer: function(){
			this.map.getGlContext().destroyBuffer(this._glVertexBuffer);
			this._glVertexBuffer = null;
		},


		// Cache buffers with data needed to render the tiles.
		// This includes an interleaved vertices&attributes array,
		//   and the texture array.
		// This is what OpenLayers3 calls "batches" or "replays".
		_getGlBuffers: function(){

			if (this._glBuffers) {
				return this._glBuffers;
			}

			var length = Object.keys(this._tiles).length;
			var gl = this._map.getGlContext();

			// Each tile is represented by 2 triangles in a triangle strip
			//   = 6 coordinate pairs = 12 floats.
			var bytesPerTile = 24;
			var vertices = new Float32Array(length * bytesPerTile);
			var i = 0;	// Count of tiles actually loaded
			var textures = [];

			for (var key in this._tiles) {
				var tile = this._tiles[key];
				if (tile.age) {
					vertices.set(tile.glData, i * bytesPerTile);
					textures[i] = tile.texture;
					i ++;	// Tile count
				}
			}

			return {
				vertices: L.GlUtil.initBuffer(gl, vertices, gl.DYNAMIC_DRAW),
				textures: textures,
				length: i	// tile count
			};
		},



		// This is run by the map whenever the layer must re-render itself.
		// glRender() must re-attach vertices&attributes buffers,
		//    layer-specific uniforms, and do the low-level calls to render
		//    whatever geometries are needed.
		glRender: function(program, programName) {
			var gl = this._map.getGlContext();
			var buffers = this._getGlBuffers();

			gl.uniform1f(program.uniforms.uTileZoom, this._tileZoom);
			gl.uniform1f(program.uniforms.uNow, performance.now());

			// Bind the interleaved vertices&attributes buffer to three different
			//   attributes.
			// Each tile is 12 floats = 24 bytes:
			//   Vertices start at 0
			//   Texture coords start after 3 floats = 12 bytes
			//   Tile age starts after 5 floats = 20 bytes
			var attribs = program.attributes;
			gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
			gl.vertexAttribPointer(attribs.aCRSCoords,     3, gl.FLOAT, false, 24, 0);
			gl.vertexAttribPointer(attribs.aTextureCoords, 2, gl.FLOAT, false, 24, 12);
			gl.vertexAttribPointer(attribs.aAge,           1, gl.FLOAT, false, 24, 20);

			// Render tiles one by one. Bit inefficient, but simpler at
			//   this stage in development.
			for (var i=0; i< buffers.length; i++) {

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, buffers.textures[i]);
				gl.uniform1i(program.uniforms.uTexture, 0);

				// A tile is two triangles = 4 vertices
				gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
// 				gl.drawArrays(gl.LINE_LOOP, j, 4);
			}
		}

	});

})();