
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

		// Buffer accessor so that the sorting algorithm can copy chunks of memory
		//   around
		this._byteView = new Uint8Array(this._buffer, 0, this._maxSize + 192);

	},


	_grow: function() {
		/// TODO: Use ArrayBuffer.transfer() if available. This is experimental, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer

		this._maxSize += this._growSize;
		var newBuffer = ArrayBuffer(this._maxSize + 192);

		newBuffer.set(this._buffer, 0);
		this._buffer = newBuffer;
	},


	// A simple Factory pattern
	getNewTriangle: function(shaderId) {

		if (this._usedSize + 192 > this._maxSize) {
			this._grow();
		}

		var triangle = new L.GlTriangle(
			new DataView(this._buffer, this._usedSize, 192 ),
			shaderId
		);

		this._usedSize += 192;
		this._triangleCount++;

		return triangle;
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
		//   cross-browser. Setting subarrays should be just as efficient, even
		//   if readability suffers a bit.

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
		var tA = this._byteView.subarray(192 * a, 192 * (a+1));
		var tB = this._byteView.subarray(192 * b, 192 * (b+1));
		var delta;

		// Push triangles with a ID of zero to the end of the array
		if (tA.getUInt32(64+60) === 0) return true;
		if (tB.getUInt32(64+60) === 0) return false;

		// First, compare the clipspace Z-coordinate
		delta = tA.getFloat32(60) - tB.getFloat32(60);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// At same Z-coordinate, apply Z-fighting
		delta = tA.getFloat32(128 + 60) - tB.getFloat32(128 + 60);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// At same Z-fighting, break ties by texture ID.
		delta = tA.getFloat32(128 + 60) - tB.getFloat32(128 + 60);
		if (delta < 0) return false;
		if (delta > 0) return true;

		// If everything is the same, prevent spurious swaps
		return false;
	}





});












