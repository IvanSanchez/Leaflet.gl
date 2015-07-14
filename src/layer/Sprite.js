// A Sprite is basically a WebGL-enabled marker+icon.
//
// A sprite is a point-based entity (unlike a 3D "billboard", which is a polygon rotated
//   to face the user).
//
// The image pixel to screen pixel ratio of a L.Sprite is static (usually 1:1). L.Sprites
//   do not scale up/down when they appear to be nearer/further away.
//
// TODO: L.Sprites are supposed to gracefully degrade down to a Marker+Icon on non-webGL
//
// Enabling WebGL for Markers + Icons is not really a feasible idea. Some L.Icons depend
//   heavily on CSS classes to select the right image, and this would be incredibly
//   difficult to replicate here.
//
// Internally, a sprite will create two triangles in the vertex shader, behaving like a
//   fake geometry shader. This is inspired by MapBox's way of extruding lines into
//   triangle strips (https://www.mapbox.com/blog/drawing-antialiased-lines/)

L.Sprite = L.Layer.extend({

	options: {
		// spriteUrl: '',
		// spriteSize: L.point(),
// 		spriteAnchor: L.point(),
		opacity: 1
	},

	initialize: function(latLng, iconUrl, options) {
		L.setOptions(this, options);
		this._latLng = L.latLng(latLng);
		this._url = iconUrl;
	},

	onAdd: function(map) {
		map.registerGlProgram('sprite', 3,
			include('sprite.v.js'),	// Vertex shader
			include('sprite.f.js'),	// Fragment (pixel) shader
			['aCRSCoords', 'aTextureCoords', 'aPixelOffset'],	// Attributes
			['uTexture', 'uOpacity', 'uCanvasSize']	// Uniforms
// 			['uTexture', 'uOpacity', 'uPixelSize']	// Uniforms
		);

// 		this._initImage();

		this._image = L.DomUtil.create('img');
		this._image.onload = L.bind(this.fire, this, 'load');
		this._image.onerror= L.bind(this.fire, this, 'error');
		this.on('load', this._onLoad, this);
		this.on('error', function(err) {console.error(err);}, this);
		this._image.src = this._url;

	},

	onRemove: function(map) {
		imageOverlayProto.onRemove.call(this, map);

		if (this._glBuffer) {
			var gl = map.getGlContext();
			gl.destroyBuffer(this._glVertexBuffer);
			gl.deleteTexture(this._texture);
		}

		map.detachLayerFromGlProgram(this, 'sprite');
	},



	_onLoad: function(ev) {

		/////////////FIXME!!!!!!!!!!!!!!!!!
		/// Calculate pixel offsets for the corners of the quad,
		///   set as attributes, use in the vertex shader to offset
		///   vertices.

		if (!this.options.spriteSize) {
			this.options.spriteSize = new L.Point(ev.originalTarget.width, ev.originalTarget.height);
		}

		if (!this.options.spriteAnchor) {
			this.options.spriteAnchor = this.options.spriteSize.divideBy(2);
		}
		
		this._glData = new Float32Array(28);
		this._age = performance.now();
		
		var sz = this.options.spriteSize,
		    an = this.options.spriteAnchor,
		    nw = an.multiplyBy(-1),
		    se = sz.subtract(an),
		    coords = this._map.options.crs.project( this._latLng );
		
		// Interleaved buffer: coordinate, pixel offset, texture coordinate
		this._glData.set([
		coords.x, coords.y, 0,
		nw.x, nw.y,
		1, 1,
		coords.x, coords.y, 0,
		se.x, nw.y,
		0, 1,
		coords.x, coords.y, 0,
		nw.x, se.y,
		1, 0,
		coords.x, coords.y, 0,
		se.x, se.y,
		0, 0
		]);

		console.log(this._glData);

		var gl = this._map.getGlContext();
		this._glBuffer = L.GlUtil.initBuffer(gl, this._glData, gl.STATIC_DRAW);
		this._texture = L.GlUtil.initTexture(this._map.getGlContext(), this._image);


		map.attachLayerToGlProgram(this, 'sprite');
		map.glRenderUntil(200);
	},

	/// FIXME!!!
	glRender: function(program, programName) {
		var gl = this._map.getGlContext();

		var opacity = this.options.opacity * Math.min((performance.now() - this._age) / 200, 1);

// 		console.log(this);
// 		console.log(opacity);
// 		console.log('Sprite at ', this._latLng, ' rendering');
		
		/// FIXME!!!
		var mapSize = this._map.getSize();
// 		var pixelSize = new L.Point(0.1, 0.1);
		
// 		gl.uniform1f(program.uniforms.uOpacity, opacity);
		gl.uniform1f(program.uniforms.uOpacity, 1.0);
		gl.uniform2f(program.uniforms.uCanvasSize, mapSize.x, mapSize.y );
// 		gl.uniform2f(program.uniforms.uPixelSize, 
// 			10 * 2.0 / mapSize.x, 
// 			10 * 2.0 / mapSize.y );

// 		console.log(10 * 2.0 / mapSize.x, 10 * 2.0 / mapSize.y);
		
		// Bind the interleaved vertices&attributes buffer to two different
		//   attributes.
		// An vertex is 7 floats = 28 bytes:
		//   Vertices start at 0
		//   pixel offsets start after 3 floats = 12 bytes
		//   Texture coords start after 5 floats = 20 bytes
		var attribs = program.attributes;
		gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
		gl.vertexAttribPointer(attribs.aCRSCoords,     3, gl.FLOAT, false, 28, 0);
		gl.vertexAttribPointer(attribs.aPixelOffset,   2, gl.FLOAT, false, 28, 12);
		gl.vertexAttribPointer(attribs.aTextureCoords, 2, gl.FLOAT, false, 28, 20);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.uniform1i(program.uniforms.uTexture, 0);

		// An image is two triangles = 4 vertices
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
// 				gl.drawArrays(gl.LINE_LOOP, 0, 4);

	}


});






L.sprite = function(latLng, iconUrl, opts) {
	return new L.Sprite(latLng, iconUrl, opts);
};





