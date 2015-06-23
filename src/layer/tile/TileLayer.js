

if (L.Browser.gl) {


	var tileLayerPreviousMethods = {
		onAdd: L.TileLayer.prototype.onAdd,
		onRemove: L.TileLayer.prototype.onRemove,
	};

	L.TileLayer.addInitHook(function(){
		this._glBuffer = null;
		this.options.crossOrigin = true;
	});


	L.TileLayer.include({

		onAdd: function(map) {
			tileLayerPreviousMethods.onAdd.call(this, map);
			map._glLayers.tile.push(this);
		},

		onRemove: function(map) {
			tileLayerPreviousMethods.onRemove.call(this, map);
			map._glLayers.tile.splice(map._glLayers.tile.indexOf(this), 1);
		},

		_initContainer: function() {},
	//
	//
	// // 	_initTile: function(tile) {
	// //
	// //
	// // 	},
	//
	//
	// // 	_addTile: function(coords, container) {
	// //
	// // 	},
	//
	//
	// 	createTile: function (coords, done) {
	// 		console.log(coords);
	//
	// 	},
	//
	//
	// 	_tileOnLoad: function(done, tile) {},
	//
	// 	_tileOnError: function(done, tile, e) {},

		_tileReady: function(tileCoords, err, tile) {
			// When the underlying image is done, create triangles
			//   and add texture.
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

			tile.loaded = +new Date();
			tile.crsCoords = this._tileCoordsToProjectedBounds(tileCoords);
// 			tile.el.crossOrigin = 'Anonymous';
			tile.texture = L.GlUtil.initTexture(this._map._gl, tile.el);

			this.fire('tileload', {
				tile: tile.el,
				coords: tileCoords
			});

			if (this._noTilesToLoad()) {
				this._loading = false;
				this.fire('load');
			}

	// 		var gl = this._map._gl;
	// 		tile.texture = gl.createTexture();
	//
	// 		gl.bindTexture(gl.TEXTURE_2D, texture);
	// 		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

			this._invalidateGlVertexBuffer();
			this._map._glRender();
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
	// console.log(scale);

			nwPoint = transformation.untransform(nwPoint, scale);
			sePoint = transformation.untransform(sePoint, scale);

	// nw = map.wrapLatLng(map.unproject(nwPoint, coords.z)),
	// se = map.wrapLatLng(map.unproject(sePoint, coords.z));

			return new L.Bounds(nwPoint, sePoint);
		},

		_removeTile: function (key) {
			var tile = this._tiles[key];
			if (!tile) { return; }

			this._map._gl.deleteTexture(tile.texture);

			delete this._tiles[key];

			this.fire('tileunload', {
				tile: tile.el,
				coords: this._keyToTileCoords(key)
			});
		},

		_invalidateGlVertexBuffer: function(){
			this._glVertexBuffer = null;

		},

		getGlVertexBuffer: function(){

			if (this._glVertexBuffer) { return this._glVertexBuffer; }

			var length = Object.keys(this._tiles).length;
// 			console.log(length, this._tiles);

			// Each tile is represented by 2 triangles in a triangle strip
			//   = 4 coordinate pairs = 8 floats.
			var vertices = new Float32Array(length * 8);
			var textureCoords = new Float32Array(length * 8);
			var i = 0, j = 0;
			var textures = [];

			for (var key in this._tiles) {
				if (this._tiles[key].loaded) {
					var coords = this._tiles[key].crsCoords;
					vertices.set([
						coords.min.x, coords.min.y,
						coords.max.x, coords.min.y,
// 						coords.max.x, coords.max.y,
						coords.min.x, coords.max.y,
						coords.max.x, coords.max.y,
// 						coords.min.x, coords.min.y
					], i);

					textureCoords.set([
						0, 1,
						1, 1,
						0, 0,
						1, 0,
					], i);

					textures[j] = this._tiles[key].texture;
					i += 8;	// Float count
					j += 4;	// Vertex count
				}
			}

// 			console.log('New tilelayer vertices: ', vertices, i);

			this._glVertexBuffer = L.GlUtil.initBuffer(this._map._gl, vertices, this._map._gl.DYNAMIC_DRAW);
			this._glVertexBuffer.length = j;	// Vertex count
			this._glVertexBuffer.textures = textures;
			this._glVertexBuffer.textureCoordsBuffer =
				L.GlUtil.initBuffer(this._map._gl, textureCoords, this._map._gl.DYNAMIC_DRAW);
			return this._glVertexBuffer;
		}



	//
	// 	bringToFront: function () {},
	// 	bringToBack: function () {},
	//
	// // 	_updateOpacity: function () {}	/// FIXME
	//
	//
	//

	});


}