
# Musings about the megashader

The idea behind the megashader is to have just one shader for all the 3D primitives that Leaflet.gl uses, in order to minimize the number of draw calls (which is commonly the bottleneck in GL performance).

The main reason behind not using multiple shaders is transparency. GL is *very* good at drawing opaque things with sharp edges (and then antialiasing them), but most (if not all) Leaflet layers allow for a `opacity` option. Furthermore, the default image for the markers/sprites has an alpha channel. It's possible to drop completely transparent pixels, but semi-transparent pixels *will* screw up the z-buffer.

The only (reliable) solution for lots and lots of semitransparent stuff at potentially different z-levels is to implement back-to-front rendering. Which means the CPU code will need to sort the triangles whenever the perspective changes. This reordering will need lots of algortihmic trickery to be efficient.

Using texture atlases will be needed to further minimize the number of draw calls (and to display image overlays larger than the maximum texture size). This will be just a performance upgrade once the megashader is in place.

Primitives include tiles, image overlays, sprites ("markers"), circles, lines and fills.

Primitives will add triangles to a big structure shared by all layers and controlled by the L.Map class. Triangles will hold data for three vertices, plus info about the triangle itself interleaved between the three vertices:

* Which sub-shader to use (tile/overlay, sprite, line, fill)
* Which texture index to use, if any
* Cached computed clipspace z-coordinate
* z-fighting resolution index (something to display tiles for the nearest zoom level on top of other tiles)
* Opaque flag (to render opaque triangles first and apply different ordering)
* ID (to delete triangles when layers are removed)

The vertex data is different between primitives:

|                         | Datatype  | Bytes | Tile | Img over | Sprite | Line | Fill |
| ----------------------- | --------- | ----: | :--: | :------: | :----: | :--: | :--: |
| CRS coordinates         | float * 3 |    12 |  X   |  X       |  X     |  X   |  X   |
| Texture coordinates     | float * 2 |     8 |  X   |  X       |  X     |      |      |
| Pixel offset            | float * 2 |     8 |      |          |  X     |      |      |
| Rotation angle          | float * 1 |     4 |      |          |  X     |      |      |
| Colour                  | float * 4 |    16 |      |          |        |  X   |  X   |
| Line prev vertex CRS    | float * 3 |    12 |      |          |        |  X   |      |
| Line next vertex CRS    | float * 3 |    12 |      |          |        |  X   |      |
| Line width              | float * 1 |     4 |      |          |        |  X   |      |
| Line side               | 1 bit     |     1 |      |          |        |  X   |      |
|                         |           |       |  20  |  20      |  32    | 56/57 | 28  |

Vertices for lines need to hold the previous and next vertex in order to calculate the normal vector (or rather, the "extrusion vector" as per Mapbox nomenclature). The line side specifies if the vertex has to be extruded to the left or to the right.

The line vertices hold the CRS coordinates of the vertices, to allow rendering the line perpendicular to the eye (otherwise, the line might be aligned with the XY plane)

Line width could be factored by a number (e.g. an integer amount of hundredths of a pixel) and packed into less bits, along with the line side. Consider whether a per-vertex line feather value is needed. Or use two subshaders for lines, one for each side, sharing the rest of the code.


\newpage

# Something that resembles a spec

64 bytes per vertex seems like a reasonable number (64*3 = 192 bytes per triangle). After all, we computer guys love powers of 2. Also, keep in mind that vertex attributes are ([usually](http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/#maximum-vertex-attributes)) limited to 16. A few things overlap between primitives, so let's go with:

| Offset   | 4-Index  | Tile   | Img over | Sprite   | Line   | Fill   | Notes  |
| -------: | -------: | :----: | :------: | :------: | :----: | :----: | ------ |
|        0 |        0 | subshader | subshader | subshader | subshader | subshader | 1 byte |
|        1 |      0+1 | flags  | flags    | flags    | flags  | flags  | 1 byte: megashader |
|        2 |      0+2 | flags  | flags    | flags    | flags  | flags  | 1 byte: subshader |
|        3 |      0+3 |        |          |          |        |        | 1 byte: Padding |
|        4 |        1 | CRS x  | CRS x    | CRS x    | CRS x  | CRS x  |        |
|        8 |        2 | CRS y  | CRS y    | CRS y    | CRS y  | CRS y  |        |
|       12 |        3 | CRS z  | CRS z    | CRS z    | CRS z  | CRS z  |        |
|       16 |        4 | tex s  | tex s    | tex s    | col r  | col r  |        |
|       20 |        5 | tex t  | tex t    | tex t    | col g  | col g  |        |
|       24 |        6 | tex id | tex id   | tex id   | col b  | col b  |        |
|       38 |        7 | col a  | col a    | col a    | col a  | col a  |        |
|       32 |        8 |        |          | offset x | prev x |        |        |
|       36 |        9 |        |          | offset y | prev y |        |        |
|       40 |       10 |        |          |          | prev z |        |        |
|       44 |       11 |        |          |          | next x |        |        |
|       48 |       12 |        |          |          | next y |        |        |
|       52 |       13 |        |          |          | next z |        |        |
|       56 |       14 |        |          |          | width  |        |        |
|       60 |       15 |        |          |          |        |        | Interleaved data |

* Subshader: which subshader to use (tile, sprite, line, etc)
* Megashader flags include opaqueness hint
* Subshader flags include line side
* Padding might be used in the future
* Texture ID is a 32-bit int which is used only outside of shader code (i.e. in Javascript, not in GLSL)
* Interleaved data is different between the three vertices of a triangle:
	* cached clipspace Z-coordinate (to sort triangles back-to-front)
	* _leaflet_id (to delete triangles when needed)
	* z-fighting index

* Colour and opacity might be packed as 4 int8s instead of as 4 float32s.

## Needed changes to the API

* Code megashader
	* Code tile / image overlay subshader
	* Code sprite subshader
	* Future: Code line subshader
	* Future: Code fill subshader
	* Future: Code circle? subshader

* Implement `L.Map.glAddTriangle(data)`
* Implement `L.Map.glDeleteTriangles(leafletId)`
* Implement `L.Map.glInvalidateBackToFront()`
* Implement `L.Map._glSortBackToFront()`
	* Consider having a set of triangles for opaque and a set of triangles for semitransparent
	* Sort by opaqueness hint, then if opaque
		* Sort by z-fighting index, then
		* Sort by texture ID
	* If not opaque
		* Sort by clipspace z-index
	* Re-set arrays with stop points for the texture binding changes (also for the end of the triangles structure)
	* Reimplement `L.Map._glRender()`

* Rename `L.Map.registerGlProgram()` into `L.Map._glInit()`
* Remove `L.Map.attachLayerToGlProgram()`
* Remove `L.Map.detachLayerFromGlProgram()`









