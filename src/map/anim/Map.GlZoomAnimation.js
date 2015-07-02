
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
			   bezier: L.util.unitBezier(0, 0, 0.25, 1),
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
