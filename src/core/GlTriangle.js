

// A L.GlTriangle represents three vertices to be fed to the GL shaders.
// It is really just a simple wrapper over a DataView (which is little more than
//   a fixed-sized chunk of memory), which has to be provided at instantiation time.

// GlTriangles are hard-coded to be 192 bytes long, with 64 bytes per vertex, of which
//   only 60 are vertex data and 4 are interleaved, triangle-specific data.
// Note the 2 first bytes of each vertex are set by the triangle and must
//   be treated as read-only.
// Having interleaved data allows the GL code to loop through the triangles seamlessly
//   by assuming their vertices are 64 bytes long instead of 60.

// There are three 4-byte words of interleaved data (one per vertex):
//   Offset 60: cached clipspace z-coordinate (float32),
//   Offset 64+60: triangle ID (uint32),
//   Offset 128+60: z-fighting resolution index (int32)

L.GlTriangle = L.Class.extend({

	initialize: function(dataView, shaderId) {
		this._dataView = dataView;
		this._dataView.setUInt8(0, shaderId);
		this._dataView.setUInt32(64+60, ++L.Util.lastId);	// Set new triangle ID
	},


	// Gets a raw DataView for the 0th, 1st or 2nd vertex.
	getVertex: function(index) {
		return new DataView(this._dataView.buffer, i * 64, 60);
	},


	setClipspaceZ: function(z) { return this._dataView.setFloat32(60, z); },
	getClipspaceZ: function() { return this._dataView.getFloat32(60); },

	setZFighting: function(z) { return this._dataView.setFloat32(128+60, z); },
	getZFighting: function() { return this._dataView.getFloat32(128+60); },

	// Sets the ID to zero so the triangle is destroyed during the next
	//   sorting of the triangles array.
	purge: function() {
		this._dataView.setUInt32(64+60, 0);
	},
	getID: function() { return this._dataView.getUInt32(64+60); },




});


L.glTriangle = function(dataView, shaderId) {
	return new L.GlTriangle(dataView, shaderId);
}
