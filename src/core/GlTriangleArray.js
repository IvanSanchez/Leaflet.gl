
// A L.GlTriangleArray represents a set of triangles, and provides functions for
//   creating a new triangle, and sorting the whole thing (in such a way that
//   tries to batch as much stuff as possible to minimize context switches during
//   rendering).

// See L.GlTriangle for details on how the interleaved data is handled. The triangle
//   array will work closely with those values to sort itself.


L.GlTriangleArray = L.Class.extend({

	// The triangle arrays will grow dinamically, adding this amount of bytes each time
	_growSize: 65536,

	initialize: function() {
		this._maxSize = this._growSize;

		// The sorting algorithm needs room for a triangle in order to swap items, thus
		//   192 extra bytes.
		this._buffer = ArrayBuffer(this._maxSize + 192);
		this._usedSize = 0;
		this._triangleCount = 0;

		// Buffer accessors so that the sorting algorithm can copy chunks of memory
		//   around
		this._byteView = new Uint8Array(this._buffer, 0, this._maxSize + 192);
		this._dataView = new DataView(this._buffer, 0, this._maxSize + 192);


		// Stores references to instances to GlTriangles.
		this._trianglesById = {};

		// Stores references to each triangle's DataView.
		// Used in the sorting algorithm to re-reference all triangles.
		this._triangleRawViews = [];

	},


	_grow: function() {
		/// TODO: Use ArrayBuffer.transfer() if available. That is experimental,
		///   see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer

		this._maxSize += this._growSize;
		var newBuffer = ArrayBuffer(this._maxSize + 192);

		newBuffer.set(this._buffer, 0);
		this._buffer = newBuffer;
		this._byteView = new Uint8Array(this._buffer, 0, this._maxSize + 192);
		this._dataView = new DataView(this._buffer, 0, this._maxSize + 192);
	},


	// A simple Factory pattern
	getNewTriangle: function(shaderId) {

		if (this._usedSize + 192 > this._maxSize) {
			this._grow();
		}

		//// WARNING: This will create a triangle based on a memory slot...
		////   which means the contents of the triangle WILL change whenever
		////   the triangle array gets sorted!!!!!!
		var triangle = new L.GlTriangle(
			new DataView(this._buffer, this._usedSize, 192 ),
			shaderId
		);

		this._usedSize += 192;

		/// TODO:
		// * Create an entry in a "raw triangle dataviews" array. This is a javascript
		//     array, 0-indexed, pointing to a set of raw DataViews.
		// * Create an entry in a "triangles-by-ID" map. This is a javascript object,
		//     with triangle IDs as keys and L.GlTriangles as values
		// * Whenever the sorting algorithm runs, reset the (private) _dataView property
		//     of each GlTriangle to one of the (already instantiated) elements from the
		//     "raw triangle dataviews" array.

		this._trianglesById[ triangle.getId() ] = triangle;
		this._triangleRawViews[triangleCount] = triangle._dataView;

		this._triangleCount++;

		return triangle;
	},



	/// FIXME!!!
	getTriangleById: function(id) {

	},



	// In-place quicksort algorithm
	sort: function() {
		this._qsort(0, this._triangleCount);
	},


	// Quicksort algorithm. Select a pivot in the middle of the specified range,
	//   partition the array, run recursively until the trivial case of sorting
	//   zero or one elements.
	_qsort: function(lo, hi){
		if (hi-1 > lo) {
			var p = Math.floor((hi + lo) / 2);

			p = this._partition(lo, hi, p);

			this._qsort(lo, p);
			this._qsort(p + 1, hi);
		}
	},


	// Part of the quicksort algorithm
	//   swaps triangles "lower" than a pivot to the beginning of the array,
	//   returns the resulting index of the pivot
	_partition: function(lo, hi, pv){

		this._swap(pv, hi-1);

		var s = lo;
		for (var i = lo; i < hi-1; i++) {
			if (this._compare(i, p)) {
				this._swap(s++, i);
			}
		}

		this._swap(hi-1, s);

		return s;
	},


	// Swap the memory chunks for two triangles (given their 0-based indexes in the buffer),
	//   in an efficient low-level fashion
	_swap: function(i, j) {

		// There are several ways to copy stuff inside an ArrayBuffer, see
		//   https://jsperf.com/typedarray-set-vs-loop/4
		// Ideally I'd like to use copyWithin, but as of 2015 it's not really
		//   cross-browser. Setting subarrays should be just as efficient (they
		//   should both compile to a memcpy in bytecode), even if readability
		//   suffers a bit.

		var tI = this._byteView.subarray(192 * i, 192 * (i+1));
		var tJ = this._byteView.subarray(192 * j, 192 * (j+1));
		var tZ = this._byteView.subarray(this._maxSize, this._maxSize + 192);

		tZ.set(tI);
		tI.set(tJ);
		tJ.set(tZ);
	},


	// Compares the a-th and b-th triangles. Returns true if the a-th triangle is
	//   "lower" than b-th, meaning A has to be rendered before B, meaning A
	//   is further away from the eye than B.
	// Heuristics are applied here: the algorithm tries to put together
	//   triangles with shared textures, etc to minimize context changes.
	_compare: function(a, b) {
		/// TODO: Replace subarrays with refs to the "raw triangle dataviews" array
		///   (typedArrays do not have getFloat() (etc) methods.
		var offsetA = 192 * a;
		var offsetB = 192 * b;
		var delta;

		// Push triangles with a ID of zero to the end of the array
		if (this._dataView.getUInt32(offsetA + 64+60) === 0) return true;
		if (this._dataView.getUInt32(offsetB + 64+60) === 0) return false;

		// First, compare the clipspace Z-coordinate
		delta = this._dataView.getFloat32(offsetA + 60) -
		        this._dataView.getFloat32(offsetB + 60);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// At same Z-coordinate, apply Z-fighting
		delta = this._dataView.getFloat32(offsetA + 128 + 60) -
		        this._dataView.getFloat32(offsetB + 128 + 60);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// At same Z-fighting, break ties by texture ID.
		delta = this._dataView.getFloat32(offsetA + 24) -
		        this._dataView.getFloat32(offsetB + 24);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// If everything is the same, prevent spurious swaps
		return false;
	}





});












