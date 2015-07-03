// L.ImageOverlay modifies the behaviour of all image overlays to use WebGL
//   to render themselves.

(function(){

	var imageOverlayProto = L.extend({}, L.ImageOverlay.prototype);

	L.ImageOverlay.addInitHook(function(){
		// Cross-origin stuff needed for images to be loaded into textures.
		// If the tileserver does not allow CORS, tiles cannot be loaded into
		//   a canvas or a WebGL texture.
		this.options.crossOrigin = true;
	});


	L.ImageOverlay.include({

		onAdd: function(map) {
			// Tell the map we'll be using a GL program to render ourselves, instead of
			//   a map pane.
			// Programs are reused between layers which share a program with the same
			//   name.
			map.registerGlProgram('imageoverlay', 2,
				include('imageoverlay.v.js'),	// Vertex shader
				include('imageoverlay.f.js'),	// Fragment (pixel) shader
				['aCRSCoords', 'aTextureCoords'],	// Attributes
				['uTexture', 'uOpacity']	// Uniforms
			);


// 			if (!this._glBuffer) {
			this._initImage();

			this.on('load', this._onLoad, this);


// 			if (this.options.interactive) {
// 				L.DomUtil.addClass(this._image, 'leaflet-interactive');
// 				this.addInteractiveTarget(this._image);
// 			}
		},

		onRemove: function(map) {
			imageOverlayProto.onRemove.call(this, map);

			if (this._glBuffer) {
				var gl = map.getGlContext();
				gl.destroyBuffer(this._glVertexBuffer);
				gl.deleteTexture(this._texture);
			}

			map.detachLayerFromGlProgram(this, 'imageoverlay');
		},


		_onLoad: function(ev) {

			this._glData = new Float32Array(20);
			this._age = performance.now();
			var nw = this._map.options.crs.project( this._bounds.getNorthWest() );
			var se = this._map.options.crs.project( this._bounds.getSouthEast() );

			console.log(nw, se);

			// Interleaved coordinate - textureCoords buffer
			this._glData.set([
				se.x, nw.y, 0,
				1, 0,
				nw.x, nw.y, 0,
				0, 0,
				se.x, se.y, 0,
				1, 1,
				nw.x, se.y, 0,
				0, 1
			]);


			var gl = this._map.getGlContext();
			this._glBuffer = L.GlUtil.initBuffer(gl, this._glData, gl.STATIC_DRAW);
			this._texture = L.GlUtil.initTexture(this._map.getGlContext(), this._image);


			map.attachLayerToGlProgram(this, 'imageoverlay');
		},


		// This is run by the map whenever the layer must re-render itself.
		// glRender() must re-attach vertices&attributes buffers,
		//    layer-specific uniforms, and do the low-level calls to render
		//    whatever geometries are needed.
		glRender: function(program, programName) {
			var gl = this._map.getGlContext();

			var opacity = this.options.opacity * (performance.now() - this._age) / 200;

			gl.uniform1f(program.uniforms.uOpacity, opacity);

			// Bind the interleaved vertices&attributes buffer to two different
			//   attributes.
			// An image is 5 floats = 20 bytes:
			//   Vertices start at 0
			//   Texture coords start after 3 floats = 12 bytes
			var attribs = program.attributes;
			gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
			gl.vertexAttribPointer(attribs.aCRSCoords,     3, gl.FLOAT, false, 20, 0);
			gl.vertexAttribPointer(attribs.aTextureCoords, 2, gl.FLOAT, false, 20, 12);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this._texture);
			gl.uniform1i(program.uniforms.uTexture, 0);

			// An image is two triangles = 4 vertices
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
// 				gl.drawArrays(gl.LINE_LOOP, j, 4);
		}

	});

})();