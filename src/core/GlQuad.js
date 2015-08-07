

// A L.GlQuad is just a way to sync data writes to two L.GlTriangles,
//   kinda a decorator/delegator.
// Factory methods should make sure of creating the triangles and then
//   wrapping them into a GlQuad.

L.GlQuad = L.Class.extend({

	initialize: function(triangleA, triangleB) {
		this._a = triangleA;
		this._b = triangleB;
	},

	fillVertex: function(index) {
		if (index === 0) {
			triangleA.fillVertex.call(arguments);
		} else if (index === 1 || index === 2) {
			triangleA.fillVertex.call(arguments);
			triangleB.fillVertex.call(arguments);
		} else if (index === 3) {
			arguments[0] = 0;	// Set vertex index to zero instead of 3
			triangleB.fillVertex.call(arguments);
		}
	},

	purge: function() {
		this._a.purge();
		this._b.purge();
	},

	setZFighting: function(z) {
		this._a.setZFighting(z);
		this._b.setZFighting(z);
	},

	getZFighting: function() { return this._a.getZFighting(z); }


});


