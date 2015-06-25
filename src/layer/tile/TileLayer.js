if (L.Browser.gl) {


	var tileLayerPreviousMethods = {
		onAdd: L.TileLayer.prototype.onAdd,
		onRemove: L.TileLayer.prototype.onRemove,
	};

	L.TileLayer.addInitHook(function(){
		// Cross-origin stuff needed for images to be loaded into textures.
		// If the tileserver does not allow CORS, tiles cannot be loaded into
		//   a canvas or a WebGL texture.
		this.options.crossOrigin = true;
	});


	L.TileLayer.include({

		onAdd: function(map) {
			tileLayerPreviousMethods.onAdd.call(this, map);

			// Tell the map we'll be using a GL program to render ourselves, instead of
			//   a map pane.
			map.attachLayerToGlProgram(this, 'tile');
		},

		onRemove: function(map) {
			tileLayerPreviousMethods.onRemove.call(this, map);

			map.detachLayerFromGlProgram(this, 'tile');
		},

		// Prevent creating an element and adding it to a map pane by doing nothing here.
		_initContainer: function() {},


		// When the underlying image is done, create triangles
		//   and add texture.
		_tileReady: function(tileCoords, err, tile) {
// console.log(coords);
// 		console.log(crsCoords.min, crsCoords.max);
// 		console.log(this._tileCoordsToBounds(tileCoords).toBBoxString());

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

			// Store a few things needed to later create the GL buffers.
			tile.loaded = +new Date();
			tile.crsCoords = this._tileCoordsToProjectedBounds(tileCoords);
			tile.texture = L.GlUtil.initTexture(this._map._gl, tile.el);
			tile.age = performance.now();
			tile.tileZoom

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

			this._map.getGlContext().deleteTexture(tile.texture);

			delete this._tiles[key];

			this.fire('tileunload', {
				tile: tile.el,
				coords: this._keyToTileCoords(key)
			});
		},

		_invalidateGlVertexBuffer: function(){
			this._glVertexBuffer = null;
		},


		// Cache buffers with data needed to render the tiles.
		// This includes the vertices array, textures, and all
		//   per-vertex attributes needed.
		_getGlBuffers: function(){

			if (this._glBuffers) {
				return this._glBuffers;
			}

			var length = Object.keys(this._tiles).length;
			var gl = this._map.getGlContext();
// 			console.log(length, this._tiles);

			// Each tile is represented by 2 triangles in a triangle strip
			//   = 6 coordinate pairs = 12 floats.
			var vertices      = new Float32Array(length * 12);
			var textureCoords = new Float32Array(length * 8);
			var tileAge       = new Float32Array(length * 4);
			var i = 0;
			var textures = [];

			for (var key in this._tiles) {
				var tile = this._tiles[key];
				if (tile.loaded) {

					var coords = tile.crsCoords;
					var tileZoom = tile.coords.z;
					vertices.set([
						coords.min.x, coords.min.y, tileZoom,
						coords.max.x, coords.min.y, tileZoom,
// 						coords.max.x, coords.max.y, tileZoom,
						coords.min.x, coords.max.y, tileZoom,
						coords.max.x, coords.max.y, tileZoom,
// 						coords.min.x, coords.min.y, tileZoom
					], i * 12);	// Insert at index (tile count * 12)

					// All textures cover the entire geometry
					textureCoords.set([
						0, 1,
						1, 1,
						0, 0,
						1, 0,
					], i * 8);

					tileAge.set([
						tile.age,
						tile.age,
						tile.age,
						tile.age
					], i * 4);

					textures[i] = this._tiles[key].texture;
					i ++;	// Tile count
				}
			}

// 			console.log('New tilelayer vertices: ', vertices, i);

			return {
				vertices: L.GlUtil.initBuffer(gl, vertices, gl.DYNAMIC_DRAW),
				textureCoords: L.GlUtil.initBuffer(gl, textureCoords, gl.DYNAMIC_DRAW),
				textures: textures,
				tileAge: L.GlUtil.initBuffer(gl, tileAge, gl.DYNAMIC_DRAW),
				length: i	// tile count
			};
		},



		// This is run by the map whenever the layer must re-render itself.
		// glRender() must re-attach vertices&attributes buffers,
		//    layer-specific uniforms, and do the low-level calls to render
		//    whatever geometries are needed.
		glRender: function(program) {
			var gl = this._map.getGlContext();
			var buffers = this._getGlBuffers();

			L.GlUtil.bindBufferToAttrib(gl,
				buffers.vertices, program.attributes.aCRSCoords, 3, gl.FLOAT);
			L.GlUtil.bindBufferToAttrib(gl,
				buffers.textureCoords, program.attributes.aTextureCoords, 2, gl.FLOAT);
			L.GlUtil.bindBufferToAttrib(gl,
				buffers.tileAge, program.attributes.aAge, 1, gl.FLOAT);

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

}
