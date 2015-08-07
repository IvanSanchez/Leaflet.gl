


L.GlTriangle.Textured = L.GlTriangle.extend({

	fillVertex: function(index, crsX, crsY, crsZ, texS, texT, texID, alpha, age) {
		var offset = index * 64;

		this._dataView.setFloat32( 4, crsX);
		this._dataView.setFloat32( 8, crsY);
		this._dataView.setFloat32(12, crsZ);
		this._dataView.setFloat32(16, texS);
		this._dataView.setFloat32(20, texT);
		this._dataView.setUInt32( 24, texID);
		this._dataView.setFloat32(28, alpha);
		this._dataView.setUInt32( 56, age);
	}

});


