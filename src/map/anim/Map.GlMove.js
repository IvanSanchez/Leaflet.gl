
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
