# Leaflet.gl

Experimental WebGL support for Leaflet.

Leaflet.gl provides a WebGL canvas, context and utilities for leaflet layers to render themselves to, plus WebGL-enabled `L.TileLayer`s.

There are no huge performance improvements as of now. The only real benefit of Leaflet.gl is getting rid of the Leaflet/Leaflet#3575 bug.

Basic functionality works. Leaflet.gl hasn't been tested with other plugins, CRS definitions, non-square tiles, and other non-trivial stuff. Things should work without any hitches, but might not.

## Demo

http://ivansanchez.github.io/Leaflet.gl/demo.html


## Install/use

* Clone repo
* Run `npm install`
* Use the files in the `dist/` directory in your HTML, e.g.:

```html
	<script type="text/javascript" src="Leaflet-1.0-dev/leaflet-src.js"></script>
	<script type="text/javascript" src="dist/Leaflet.gl.js"></script>
```



## Development

### Build system

A [gobble](https://github.com/gobblejs/gobble) toolchain is needed to mix the javascript with the GLSL shaders and create something that a web browser can understand. This kinda like browserify but not exactly.

When doing some coding on Leaflet.gl itself, you want to:

* Clone repo
* Run `npm install` once
* Run `npm run-script watch`, and let it running

This way, the gobble toolchain will look for changes in the source files and keep re-building the `dist/` files automatically.

The build system does some trickery with the GLSL code, using glsl-unit to minify it, keeping names of uniforms and attributes unchanged. Vertex and fragment shaders are in separate files, and there might be GLSL files containing just helper functions.

### Architecture

Normally, Leaflet creates "map panes" (`<div>` HTML elements) which contain DOM elements for layers (things positioned on the map). Then, map panes move around when the map is dragged or panned.

Leaflet.gl creates a `<canvas>` which doesn't move with the panes. Instead, every interaction that modifies the view (i.e. changing the center or zoom) will trigger a re-render of all WebGL-enabled layers.

Internally, Leaflet.gl works with **CRS coordinates**. Not `L.LatLng`s, not offsets from the master map pane, not pixels from the top-left corner of the map container. This allows the `crs2clipspace` GLSL function to do the heavy lifting of deciding what is and what is not on the screen by doing a naïve projection of CRS coords into clipspace coords. CRS coordinates are assumed to project rectangularly on the screen.

Having different instances of the `crs2clipspace` function in the future might be possible, in those cases where the user needs a perspective or a different screen projection, even rendering on a globe. Such change would require overriding `L.Map.latLngToContainerPoint` and `L.Map.containerPointToLatLng`.

Having different GLSL files with different include-able functions is a departure from existing WebGL patterns, but keeping one copy of any GLSL code is paramount to this design. The goal is to allow having GLSL code from `L.Map` (`crs2clipspace`) and from `L.Layer`s (`main`) in the same shader, but each class handling only the attributes and uniforms of its bit of GLSL code.


### Coding new WebGL-enabled layers

During layer initialization, a layer should:

* Skip adding itself to a map pane
* Register the GL program(s) it will use, using `L.Map.registerGlProgram`
* Attach itself to the GL program(s) it needs to use initially, using `L.Map.attachLayerToGlProgram`

The other important bit is the `glRender(program, programName)` public method. The map will call this method whenever the layer has to be re-rendered.

`glRender` will be called once per GL program that the layer has registered *and* attached to. It must bind and point the uniforms and attributes it registered previously.

The vertex shader used by layers is expected to make use of the `crs2clipspace` function. This means that layers are expected to use CRS coordinates in the vertex coordinates passed to the shader.

A layer will need to use the map's GL context to attach data to the currently active program, fetch constants, or instantiate and upload buffers. To do so, use `L.Map.getGlContext()`, as in `this._map.getGlContext()`.

A layer might, during its life, want to use less or more GL programs, activating and deactivating rendering features as appropiate. To do this, use `L.Map.attachLayerToGlProgram` and `L.Map.detachLayerFromGlProgram`.


### Coding animations

Leaflet.gl runs an animation loop (based on [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) and `L.Util.requestAnimFrame`) independent to any other interaction animation.

Basic map panning, zooming and `flyTo()` animations are handled already.

`L.Map` allows triggering the render loop with:

* `L.Map.glRenderOnce()` will ask re-rendering in the next frame. Performing more than one call before the frame is rendered has no effect.
* `L.Map.glRenderUntil(milliseconds)` will start *or* lengthen the render loop. Frames will be rendered as fast as the browser allows, for at least `milliseconds` long.

`L.Map` defines four new events to deal with the rendering loop:

* `glRenderStart` fired when the render loop is started with `glRenderUntil()`.
* `glRenderStart` fired when the render loop is stopped (after both `glRenderUntil()` and `glRenderOnce()`).
* `glPrepareFrame` *before* a frame is rendered.
* `glRenderFrame` *after* a frame is rendered. This contains timing information about FPS and time spent rendering this frame.

`L.Map` defines one more private property, a plain object `L.Map._glView`:
* `L.Map._glView.center` is an instance of `L.Point` containing the CRS coordinates of the center of the canvas.
* `L.Map._glView.halfSize` is an instance of `L.Point` containing the distance, measured in CRS coordinates, from the center of the viewport to the lower-right corner.

The current zoom animation works by listening to the `glPrepareFrame` event and re-setting `L.Map._glView` prior to rendering.


### Things that should be done sooner or later

* Have a per-map invisible framebuffer, in which a different solid color (or value) is rendered for each feature. Mouse events then look up the pixel in that framebuffer to decide what its target is.
* Have a per-layer framebuffer, to cache the rendered layer, for cases where a layer is actually animated but the rest of layers can fetch the image cached in its framebuffer.






