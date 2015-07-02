/*
 * Leaflet.gl ©2015 Iván Sánchez Ortega
 *
 * "THE BEER-WARE LICENSE":
 * <ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
 *
 *
 * Leaflet.gl includes unitbezier (https://github.com/mapbox/unitbezier),
 * distributed under a 2-clause BSD license.
 */

// Adds WebGL detection to L.Browser.

L.Browser.gl = false;

try {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('webgl');
	if (context && typeof context.getParameter == 'function') {
		L.Browser.gl = 'webgl';
	} else {
		context = canvas.getContext('experimental-webgl');
		if (context && typeof context.getParameter == 'function') {
			L.Browser.gl = 'experimental-webgl';
		}
	}
} catch(e) {}



if (L.Browser.gl) {

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
	},

};

L.glUtil = {};

/*
* Copyright (C) 2008 Apple Inc. All Rights Reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
*
* THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
* IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
* PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
* CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
* EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
* PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
* PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
* OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
* Ported from MapBox's unitbezier https://github.com/mapbox/unitbezier
* which is in turn ported from Webkit
* http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
*/

L.GlUtil.UnitBezier = function (p1x, p1y, p2x, p2y) {
	// Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
	this.cx = 3.0 * p1x;
	this.bx = 3.0 * (p2x - p1x) - this.cx;
	this.ax = 1.0 - this.cx - this.bx;

	this.cy = 3.0 * p1y;
	this.by = 3.0 * (p2y - p1y) - this.cy;
	this.ay = 1.0 - this.cy - this.by;

	this.p1x = p1x;
	this.p1y = p2y;
	this.p2x = p2x;
	this.p2y = p2y;
};

L.GlUtil.UnitBezier.prototype = {

	sampleCurveX: function(t) {
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
		return ((this.ax * t + this.bx) * t + this.cx) * t;
	},

	sampleCurveY: function(t) {
		return ((this.ay * t + this.by) * t + this.cy) * t;
	},

	sampleCurveDerivativeX: function(t) {
		return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
	},

	solveCurveX: function(x, epsilon) {
		if (typeof epsilon === 'undefined') epsilon = 1e-6;

		var t0, t1, t2, x2, i;

		// First try a few iterations of Newton's method -- normally very fast.
		for (t2 = x, i = 0; i < 8; i++) {

			x2 = this.sampleCurveX(t2) - x;
			if (Math.abs(x2) < epsilon) return t2;

			var d2 = this.sampleCurveDerivativeX(t2);
			if (Math.abs(d2) < 1e-6) break;

			t2 = t2 - x2 / d2;
		}

		// Fall back to the bisection method for reliability.
		t0 = 0.0;
		t1 = 1.0;
		t2 = x;

		if (t2 < t0) return t0;
		if (t2 > t1) return t1;

		while (t0 < t1) {

			x2 = this.sampleCurveX(t2);
			if (Math.abs(x2 - x) < epsilon) return t2;

			if (x > x2) {
				t0 = t2;
			} else {
				t1 = t2;
			}

			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	},

	solve: function(x, epsilon) {
		return this.sampleCurveY(this.solveCurveX(x, epsilon));
	}
};

L.glUtil.unitBezier = function(p1x, p1y, p2x, p2y) {
	return new L.GlUtil.UnitBezier(p1x, p1y, p2x, p2y);
};

// Adds the most very basic GL animation to L.Map: render the scene every
//   time there is a 'move' or 'moveend' event.
// In effect, this makes pan *and* flyTo animations work seamlessly, as
//   every pan/flyTo frame fires a 'move' event.


(function(){

	var mapProto = L.extend({}, L.Map.prototype);

	L.Map.include({
		_initLayout: function() {
			mapProto._initLayout.call(this);

			this.on('move moveend', function(){
				this._glView.center = this.options.crs.project(this.getCenter());
				var corner = this.options.crs.project(this.containerPointToLatLng(this.getSize()));
				this._glView.halfSize = corner.subtract(this._glView.center);

				this.glRenderOnce();
			}, this);
		}
	});

})();


// Adds GL zoom animations to L.Map: whenever an animated zoom starts, trigger
//   the rendering loop, then change the view center and size every frame.


(function(){

	var mapProto = L.extend({}, L.Map.prototype);

	L.Map.include({
		_initLayout: function() {
			mapProto._initLayout.call(this);


			// There is no need to check for the "animated" option: the non-GL
			//   zoom animation code only fires 'zoomanim' when there is actually
			//   a zoom animation underway.
			this.on('zoomanim', this._onGlZoomAnimationStart, this);
			this.on('zoomend', this._onGlZoomAnimationEnd, this);
		},

		// Animation duration, in milliseconds. Should match the duration
		//   of the non-GL CSS transition
		_glZoomAnimationDuration: 250,

		// Capture start/end center/halfsize when starting a zoom animation
		//   (triggered by 'zoomanim')
		// Could also be added to Map.ZoomAnimation._animateZoom
		_onGlZoomAnimationStart: function(ev) {

			var startCenter = this.options.crs.project(this.getCenter());
			var startCorner = this.options.crs.project(this.containerPointToLatLng(this.getSize()));
			var startHalfSize = startCorner.subtract(startCenter);
			//
			var endCenter   = this.options.crs.project(this._animateToCenter);
			var endHalfSize = startHalfSize.divideBy(this.getZoomScale(this._animateToZoom, this._zoom));

			// Given the start and end center and halfsizes, infer
			//   which CRS coordinate will stay fixed in the screen
			//   during the animation

			// The proportion between the fixed point to the center and to the corner
			//   stays constant between the start and end center-sizes, so
			//   the fixed point f solves: (x-c1) / (c1+s1-x) = (x-c2) / (c2+s2-x)
			// where c1,c2 are start/end center and s1/s1 are start/end half sizes
			// https://www.wolframalpha.com/input/?i=%28x-c1%29+%2F+%28c1%2Bs1-x%29+%3D+%28x-c2%29+%2F+%28c2%2Bs2-x%29+for+x

			// x = (c2*s1-c1*s2)/(s1-s2) and s1!=s2 and s1*s2*(c1-c2+s1-s2)!=0

			var c1x = startCenter.x;
			var c1y = startCenter.y;
			var c2x = endCenter.x;
			var c2y = endCenter.y;
			var s1x = startHalfSize.x;
			var s1y = startHalfSize.y;
			var s2x = endHalfSize.x;
			var s2y = endHalfSize.y;

			var fixedX = (c2x*s1x - c1x*s2x) / (s1x - s2x);
			var fixedY = (c2y*s1y - c1y*s2y) / (s1y - s2y);

			var fixedCRSCoords = new L.Point(fixedX, fixedY);

			// Infer the (current) screen coordinate of the fixed CRS coords

			var fixedContainerCoords = this.latLngToContainerPoint(this.options.crs.unproject( fixedCRSCoords ));

			// 			console.log('zoom start', ev);
			// 			console.log('inferred fixed CRS coords:', fixedCRSCoords);
			// 			console.log('inferred fixed Container coords:', fixedContainerCoords);

			var size = this.getSize();
			var relativeContainerPoint = new L.Point(fixedContainerCoords.x / size.x, fixedContainerCoords.y / size.y).subtract(new L.Point(0.5, 0.5)).multiplyBy(2);

			// The animation won't be started instantly. Instead, look for changes on
			//   the zoomproxy pane's CSS for transformations and start
			//   the animation on the first change. So, the initial state of the
			//   zoomproxy CSS transform has to be stored.
			var transformCSS = this._container.querySelector('.leaflet-proxy.leaflet-zoom-animated').style.transform;

			this._glZoomAnimation = {
				startHalfSize: startHalfSize,
				fixedCRSCoords: fixedCRSCoords,
				relativeContainerPoint: relativeContainerPoint,
				until: -1,	// Animation won't be started until there's a change in the zoom proxy div
				bezier: L.glUtil.unitBezier(0, 0, 0.25, 1),
				transformCSS: transformCSS,
				scale: this.getZoomScale(this._animateToZoom, this._zoom)
			};

			this.on('glPrepareFrame', this._onGlZoomAnimationFrame);
			this.glRenderUntil(this._glZoomAnimationDuration);
		},


		// Cancels a zoom animation (triggered on 'zoomend' when the animation is over)
		// Could also be added to Map.ZoomAnimation._onZoomTransitionEnd
		_onGlZoomAnimationEnd: function(ev) {
			this._glZoomAnimation = null;
			this.off('glPrepareFrame', this._onGlZoomAnimationFrame);
		},

		// Sets the maps' center and half size, in CRS units,
		//   taking the zoom animation into account.
		_onGlZoomAnimationFrame: function() {
			var center = null;
			var halfSize = null;

			if (!this._glZoomAnimation) { return }

			if (this._glZoomAnimation.until === -1) {
				var transformCSS = this._container.querySelector('.leaflet-proxy.leaflet-zoom-animated').style.transform;
				if (transformCSS !== this._glZoomAnimation.transformCSS) {
					this._glZoomAnimation.until = performance.now() + this._glZoomAnimationDuration;
// 					console.log('Zoom animation started until', this._glZoomAnimation.until);
					this.glRenderUntil(this._glZoomAnimationDuration);
				} else {
// 					console.log('Zoom animation delayed');
					return;
				}
			}

			var anim = this._glZoomAnimation;

			// From 0 (animation started) to 1 (animation ended). Clamp at 1,
			// as a couple of frames might run after the zoom animation has ended.
			var t = Math.min(1 - ((anim.until - performance.now()) / this._glZoomAnimationDuration), 1);

			// Map [0,1] to [0,1] in the bezier curve
			var bezierValue = anim.bezier.solve(t);

			// Map [0,1] to [1,anim.scale]
			var scale = 1 + bezierValue * ( anim.scale - 1);

			// Interpolate halfsize, infer center from the fixed point position.
			this._glView.halfSize = halfSize = anim.startHalfSize.divideBy(scale);

			var offset = new L.Point(
				halfSize.x * anim.relativeContainerPoint.x,
				halfSize.y * anim.relativeContainerPoint.y  );

			this._glView.center = anim.fixedCRSCoords.subtract( offset );


		},


	});

})();

// L.Map is responsible for:
//  * Creating the destination canvas and WebGL rendering context
//  * Keeping track of the main WebGL rendering loop, including animations
//  * Exposing an interface for layers so they can hook up to the map's WebGL
//      context, programs, and rendering loop.


(function(){

	// Keep a copy of the L.Map prototype before the include() call, so the
	//   previous methods can be called before overwriting them.
	var mapProto = L.extend({}, L.Map.prototype);

// 		L.Map.addInitHook(function() {
// 			this.on('move moveend', this.glRenderOnce, this);
// 		});

	L.Map.include({

		_initLayout: function() {

			mapProto._initLayout.call(this);

			var size = this.getSize();
			this._glCanvas = L.DomUtil.create('canvas', 'leaflet-webgl', this._container);
			var gl = this._gl = this._glCanvas.getContext(L.Browser.gl, {premultipliedAlpha:false});


			this._glPrograms = [];
			this._glLayers = {};
			this._glView = {};	// Center and half-size of the current view. Might change every frame.

			this._glResizeCanvas();


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

		},


		// Registers a GL program. Classes which can render themselves into
		//   WebGL are expected to provide their own shader code and register
		//   the program they use.
		// Programs are reused between layers. Programs have a short name (e.g.
		//   'tile', 'marker', 'line', 'circle') - only the first time that
		//   a program name is registered is taken into account.
		// The normal workflow for layers is to register a program, then attach
		//   themselves to that program; but there should be cases where a layer
		//   might not attach itself to a program until some condition is met; or
		//   it might detach and re-attach itself - that's why register and attach
		//   are different functions.
		registerGlProgram: function(programName, priority, vShader, fShader, attribs, uniforms) {
			if (programName in this._glLayers) { return; }

			this._glLayers[programName] = [];

			var gl = this._gl;
			if (!gl) {
				throw Error('A layer tried to register a WebGL program before the map initialized its layout and WebGL context.');
			}

			/// TODO: Find a way to switch between crs2clipspace shader functions, to switch
			///   between perspective models.
			var crs2clipspace = 'uniform vec2 uCenter,uHalfViewportSize;vec4 crs2clipspace(vec4 a){return vec4((a.x-uCenter.x)/uHalfViewportSize.x,(-a.y+uCenter.y)/uHalfViewportSize.y,a[2],a[3]);}' + '\n' ;

			var program = L.GlUtil.createProgram(gl,
				crs2clipspace +  vShader,	// Vertex shader
				fShader,	// Fragment shader
				attribs,	// Attributes
				['uCenter', 'uHalfViewportSize'].concat(uniforms)	// crs2clipspace uniforms + program uniforms
			);

			program.priority = priority;
			program.name = programName;

			// We're assuming all attributes will be in arrays
			for (var attrib in program.attributes) {
				gl.enableVertexAttribArray(program.attributes[attrib]);
			}

			this._glPrograms.push(program);
			this._glPrograms.sort(function(a, b){return a.priority - b.priority});

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
				L.Util.requestAnimFrame(this._glRender, this);
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
				L.Util.requestAnimFrame(this._glRender, this);
			}
			return this;
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

			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

			// Fetch center, half size in CRS units
			// These bits of data are set on a per-frame basis by the animations code,
			//   by listening to the 'glPrepareFrame' event.
			this.fire('glPrepareFrame');
			var view = this._glView;

			var i;
			// The programs array comes pre-sorted from registerGlProgram().
			for (var programPriority in this._glPrograms) {
				var program = this._glPrograms[programPriority];
				var programName = program.name;

				if (this._glLayers[programName].length) {
					gl.useProgram(program);

					// Push crs2clipspace uniforms
					gl.uniform2f(program.uniforms.uCenter, view.center.x, view.center.y);
					gl.uniform2f(program.uniforms.uHalfViewportSize, view.halfSize.x, view.halfSize.y);

					// Let each layer render itself using the program they need.
					// The layer will rebind vertex attrib arrays and uniforms as needed
					for (i in this._glLayers.tile) {
						this._glLayers.tile[i].glRender(program);
					}
				}
			}

			// A bit of accounting will come in handy for debugging.
			var end = performance.now();
			var frameTime = end - now;
			var fps = 1000 / (end - this._glLastFrameTimestamp);
			this.fire('glRenderFrame', {now: end, frameTime: frameTime, fps: fps});
			this._glLastFrameTimestamp = end;
		},


		invalidateSize: function(options) {
			mapProto.invalidateSize.call(this, options);
			this._glResizeCanvas();
			this.glRenderOnce();
		},

		_glResizeCanvas: function() {
			var size = this.getSize();
			this._glCanvas.style.width  = size.x + 'px';
			this._glCanvas.style.height = size.y + 'px';
			this._glCanvas.width  = size.x;
			this._glCanvas.height = size.y;
			this._gl.viewportWidth  = this._glCanvas.width;
			this._gl.viewportHeight = this._glCanvas.height;
		}


	});


})();

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
				'precision mediump float;attribute vec3 aCRSCoords;attribute vec2 aTextureCoords;varying vec2 a;attribute float aAge;varying float b;uniform float uTileZoom;void main(){gl_Position=crs2clipspace(vec4(aCRSCoords.x,aCRSCoords.y,0,1));gl_Position.z+=abs(aCRSCoords.z-uTileZoom)*1e-5;a=aTextureCoords;b=aAge;}',	// Vertex shader
				'precision mediump float;varying vec2 a;varying float b;uniform sampler2D uTexture;uniform float uNow;void main(){lowp vec4 c=texture2D(uTexture,vec2(a.s,a.t));c.a*=clamp((uNow-b)/2e2,0.,1.);gl_FragColor=c;}',	// Fragment (pixel) shader
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

}
