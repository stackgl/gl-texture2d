gl-texture2d
============
ndarray compatible wrapper for WebGLTexture objects

# Example

```javascript
var shell = require("gl-now")()
var createShader = require("gl-shader")
var createTexture = require("gl-texture2d")

shell.on("gl-init", function() {
})

shell.on("gl-render", function() {
})
```

# Install

    npm install texture2d

# API

```javascript
var createTexture = require("gl-texture2d")
```

## `var tex = createTexture(gl, ...)`
Creates a texture.  There are three basic usage patterns for this method:

### `var tex = createTexture(gl[, format, type])`
Which creates an empty texture with the given format.

* `format` is the format (default `gl.RGBA`)

### `var tex = createTexture(gl, width, height[, format, type])`
Which creates a texture with the given dimensions and format

* `width` is the width of texture
* `height` is the height of the texture
* `format` (optional) is the format of the texture (default `gl.RGBA`)
* `type` is the type of texture (default `gl.UNSIGNED_BYTE`)

### `var tex = createTexture(gl, data[, format, type])`
Creates a texture from the given data source.  Where `data` is one of the following items:

* An [`ndarray`](https://github.com/mikolalysenko/ndarray)
* An `HTMLCanvas` object
* An `HTMLImage` object
* An `HTMLVideo` object

And `format` is either specified or else inferred based on the data type.

## Texture Methods

### `tex.bind([tex_unit])`
Binds the texture for use.  Basically a short cut for:

```javascript
gl.activeTexture(gl.TEXTURE0 + tex_unit)
gl.bindTexture(gl.TEXTURE_2D, this.handle)
```

If `tex_unit` is not specified then the active texture is not changed.

### `tex.dispose()``
Destroys the texture object and releases all of its resources.  Under the hood this is equivalent to:

```javascript
gl.deleteTexture(this.handle)
```

### `tex.setPixels(data[, x_off, y_off, mip_level])`
Unpacks `data` into a subregion of the texture.  As before in the constructor `data` can be either an `ndarray`, `HTMLCanvas`, `HTMLImage` or `HTMLVideo` object.

* `x_off` is the x offset to write from. (default `0`)
* `y_off` is the y offset to write from. (default `0`)
* `mip_level` is the mip level to write to. (default `0`)

### `tex.generateMipmaps()`
Generates mipmaps for the texture.

## Texture Properties

### `tex.handle`
A handles to the underlying texture object.

### `tex.shape`
An array representing the `[height, width]` of the texture

### `tex.wrapS`
S wrap around behavior

### `tex.wrapT`
T wrap around behavior

### `tex.magFilter`
Magnification filter

### `tex.minFilter`
Minification filter

# Credits
(c) 2013 Mikola Lysenko. MIT License