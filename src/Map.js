
var previousMapMethods = {
	_initLayout: L.Map.prototype._initLayout,
	_resetView: L.Map.prototype._resetView,
};


L.Map.include(!L.Browser.gl ? {} : {

	_initLayout: function() {

		previousMapMethods._initLayout.call(this);

		var size = this.getSize();
		this._glCanvas = L.DomUtil.create('canvas', 'leaflet-webgl', this._container);
		this._glCanvas.style.width  = size.x + 'px';
		this._glCanvas.style.height = size.y + 'px';	/// TODO: Resize handler
		this._glCanvas.width  = size.x;
		this._glCanvas.height = size.y;	/// TODO: Resize handler
		var gl = this._gl = this._glCanvas.getContext(L.Browser.gl, {premultipliedAlpha:false});

		this._glCreatePrograms();


		gl.viewportWidth  = this._glCanvas.width;
		gl.viewportHeight = this._glCanvas.height;


		// When clearing the canvas, set pixels to grey transparent
		// This will make the fade-ins a bit prettier.
		gl.clearColor(0.5, 0.5, 0.5, 0);


		// Blending is needed for map tiles to be faded in
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);


		// Depth buffer is needed for rendering things on top of other things with
		//   an explicit order
		gl.enable(gl.DEPTH_TEST);


		this.on('move moveend', this.glRenderOnce, this);
		this.on('zoomanim', this._onGlZoomAnimationStart, this);
		this.on('zoomend', this._onGlZoomAnimationEnd, this);

	},



	_glCreatePrograms: function() {

		var gl = this._gl;
		var crs2clipspace = include('crs2clipspace.v.js');

		var tileProgram = L.GlUtil.createProgram(gl,
			crs2clipspace + '\n' + include('tile.v.js'),	// Vertex shader
			include('tile.f.js'),	// Fragment shader
			['aCRSCoords', 'aTextureCoords', 'aAge'],	// Attributes
			['uCenter', 'uHalfViewportSize', 'uNow', 'uTexture', 'uTileZoom']	// Uniforms
		);

		// We're assuming all attributes will be in arrays
		for (var attrib in tileProgram.attributes) {
			gl.enableVertexAttribArray(tileProgram.attributes[attrib]);
		}


		this._glPrograms = {
			tile: tileProgram
		};

		// Stores which layers uses which program.
		this._glLayers = {
			tile: [],
// 			shadow: [],
// 			vector: [],
// 			marker: []
		}

	},


	// GL layers will want to tell the map which GL program they want
	//   to use when rendering (akin to the map panes in non-GL).
	attachLayerToGlProgram: function(layer, programName) {
		if (!(programName in this._glLayers)) {
			throw new Error('Layer tried to attach to a non-existing GL program');
		}
		this._glLayers[programName].push(layer);
		return this;
	},

	// Reverse of attachLayerToGlProgram
	detachLayerFromGlProgram: function(layer, programName) {
		if (!(programName in this._glLayers)) {
			throw new Error('Layer tried to detach from a non-existing GL program');
		}
		this._glLayers[programName].splice(
			this._glLayers[programName].indexOf(layer), 1);
		return this;
	},

	// Exposes this._gl
	getGlContext: function() {
		return this._gl;
	},


	// Start the GL rendering loop.
	// Receives a number of milliseconds - how long to keep requesting
	//   animation frames and re-rendering the GL canvas.
	// This can be zero milliseconds, which means "render just once"
	glRenderUntil: function(milliseconds) {
		if (!this._glEndTime) {
			this.fire('glRenderStart', {now: performance.now()});
			this._glEndTime = performance.now() + milliseconds;
			this._glRender();
		} else {
			this._glEndTime = Math.max(
				performance.now() + milliseconds,
				this._glEndTime
			);
		}
		return this;
	},


	// Ask for the scene to be rendered once, but only if a GL render loop
	//   is not already active.
	glRenderOnce: function() {
		if (!this._glEndTime) {
			this._glEndTime = 1;
			this._glRender();
		}
		return this;
	},


	_glZoomAnimationDuration: 250,

	// Capture start/end center/halfsize when starting a zoom animation
	//   (triggered by 'zoomanim')
	// Could also be added to Map.ZoomAnimation._animateZoom
	_onGlZoomAnimationStart: function(ev) {
		var startCenter = this.options.crs.project(this.getCenter());
		var startCorner = this.options.crs.project(this.containerPointToLatLng(this.getSize()));
		var startHalfSize = startCorner.subtract(startCenter);

		var endCenter   = this.options.crs.project(this._animateToCenter);
		var endHalfSize = startHalfSize.divideBy(this.getZoomScale(this._animateToZoom, this._zoom));

		this._glZoomAnimation = {
			start: {center: startCenter, halfSize: startHalfSize },
			end:   {center: endCenter,   halfSize: endHalfSize },
			until: performance.now() + this._glZoomAnimationDuration
		}

		this.glRenderUntil(this._glZoomAnimationDuration);
	},


	// Cancels a zoom animation (triggered on 'zoomend' when the animation is over)
	// Could also be added to Map.ZoomAnimation._onZoomTransitionEnd
	_onGlZoomAnimationEnd: function(ev) {
		this._glZoomAnimation = null;
	},


	// Returns the maps' center and half size, in CRS units,
	//   taking animations into account.
	_glGetViewport: function() {
		var center = null;
		var halfSize = null;
		if (this._glZoomAnimation) {
			var anim = this._glZoomAnimation;

			// From 0 (animation started) to 1 (animation ended)
			var t = 1 - ((anim.until - performance.now()) / this._glZoomAnimationDuration);

			// Map [0,1] to the bezier curve value and clamp to a max of 1, as
			//   the animation might run for one frame after it's needed.
			// This should really be a Bezier curve, but as the implementation is
			//   completely buggy (see #2), let's fake it with an reverse parabola
			//   for the time being.
// 			t = Math.min(L.GlUtil.cubicBezierInterpolation(t, 0, 0, 0.25, 1), 1);
// 			t = Math.min(t, 1);
			t = Math.min(t, 1); t = 1 - (1-t) * (1-t);
			var s = 1-t;

			// Interpolate center and halfsize
			center   = anim.end.center.multiplyBy(t).add(anim.start.center.multiplyBy(s));
			halfSize = anim.end.halfSize.multiplyBy(t).add(anim.start.halfSize.multiplyBy(s));

		} else {	// Default, no animation whatsoever
			center = this.options.crs.project(this.getCenter());
			var corner = this.options.crs.project(this.containerPointToLatLng(this.getSize()));
			halfSize = corner.subtract(center);
		}

		return {
			center: center,
			halfSize: halfSize
		}
	},


	// Renders one frame by setting the viewport uniforms and letting layers
	//   render themselves.
	// Also controls the main render loop, requesting the next animFrame or stopping
	//   the loop if no more rendering is needed.
	_glRender: function() {
		var now = performance.now();

		if (this._glEndTime && this._glEndTime > now) {
			L.Util.requestAnimFrame(this._glRender, this);
		} else {
			this._glEndTime = null;
			this.fire('glRenderEnd', {now: performance.now()});
		}


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
// 		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
// 		gl.viewport(0, 0, size.x, size.y);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

		var projectedCenter = this.options.crs.project(this.getCenter());
		var projectedCorner = this.options.crs.project(this.containerPointToLatLng(this.getSize()));
		var halfSize = projectedCorner.subtract(projectedCenter);	// In CRS units

		// Fetch center, half size in CRS units
		var viewport = this._glGetViewport();

		var i;
		if (this._glLayers.tile.length) {

			// Activate the program
			var program = this._glPrograms.tile;
			gl.useProgram(program);

			// Push some uniforms
			gl.uniform2f(program.uniforms.uCenter, viewport.center.x, viewport.center.y);
			gl.uniform2f(program.uniforms.uHalfViewportSize, viewport.halfSize.x, viewport.halfSize.y);
			gl.uniform1f(program.uniforms.uNow, performance.now());

			// Let each layer render itself using the program they need.
			// The layer will rebind vertex arrays and vertex attrib arrays
			for (i in this._glLayers.tile) {
				this._glLayers.tile[i].glRender(program);
			}
		}

		// A bit of accounting will come in handy for debugging.
		var end = performance.now();
		var frameTime = end - now;
		var fps = 1000 / frameTime;
		this.fire('glRender', {now: end, frameTime: frameTime, fps: fps});
	}
});



