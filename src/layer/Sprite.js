
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
		// spriteAnchor: L.point(),
		opacity: 1
	},

	initialize: function(latLng, options) {
		L.setOptions(this, options);
		this._latLng = L.latLng(latLng);
	},



	onAdd: function(map) {
		// Tell the map we'll be using a GL program to render ourselves, instead of
		//   a map pane.
		// Programs are reused between layers which share a program with the same
		//   name.
		map.registerGlProgram('sprite', 3,
			include('sprite.v.js'),	// Vertex shader
			include('sprite.f.js'),	// Fragment (pixel) shader
			['aCRSCoords', 'aTextureCoords'],	// Attributes
			['uTexture', 'uOpacity']	// Uniforms
		);

		this._initImage();

		this._image = L.DomUtil.create('img');
		this._image.onload = L.bind(this.fire, this, 'load');
		this.on('load', this._onLoad, this);
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


		this._glData = new Float32Array(20);
		this._age = performance.now();

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




});












