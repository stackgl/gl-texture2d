"use strict"

var ndarray = require("ndarray")
var ops = require("ndarray-ops")
var pool = require("typedarray-pool")
var webglew = require("webglew")

function Texture2D(context, id, width, height, magFilter, minFilter, wrapS, wrapT) {
  this.context = context
  this.id = id
  this._width = width
  this._height = height
  this._magFilter = magFilter
  this._minFilter = minFilter
  this._wrapS = wrapS
  this._wrapT = wrapT
}

Object.defineProperty(Texture2D.prototype, "width", {
  get: function() {
    return this._width
  }
})

Object.defineProperty(Texture2D.prototype, "height", {
  get: function() {
    return this._height
  }
})

Object.defineProperty(Texture2D.prototype, "shape", {
  get: function() {
    return [ this._width, this._height ]
  }
})

Object.defineProperty(Texture2D.prototype, "minFilter", {
  get: function() {
    return this._minFilter
  },
  set: function(v) {
    this.bind()
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_MIN_FILTER, v)
    return this._minFilter = v
  }
})

Object.defineProperty(Texture2D.prototype, "magFilter", {
  get: function() {
    return this._magFilter
  },
  set: function(v) {
    this.bind()
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_MAG_FILTER, v)
    return this._magFilter = v
  }
})

Object.defineProperty(Texture2D.prototype, "wrapS", {
  get: function() {
    return this._wrapS
  },
  set: function(v) {
    this.bind()
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_S, v)
    return this._wrapS = v
  }
})

Object.defineProperty(Texture2D.prototype, "wrapT", {
  get: function() {
    return this._wrapT
  },
  set: function(v) {
    this.bind()
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_T, v)
    return this._wrapT = v
  }
})

Texture2D.prototype.bind = function bindTexture2D(unit) {
  var gl = this.context
  if(unit !== undefined) {
    gl.activeTexture(gl.TEXTURE0 + (unit|0))
  }
  gl.bindTexture(gl.TEXTURE_2D, this.id)
}

Texture2D.prototype.dispose = function disposeTexture2D() {
  this.context.deleteTexture(this.id)
}

Texture2D.prototype.buildMipmap = function() {
  this.bind()
  this.context.generateMipmap(gl.TEXTURE_2D)
}

Texture2D.prototype.fromDOM = function(element, format) {
  var gl = this.context
  format = format || gl.RGBA
  this.bind()
  gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, element)
  this._width = element.width
  this._height = element.height
}

Texture2D.prototype.fromURL = function fromURL(url, format, cb) {
  var img = new Image(url)
  img.onload = function() {
    this.fromDOM(img, format)
    if(cb) {
      cb(null, texture)
    }
  }
  if(cb) {
    img.onerror = function(err) {
      cb(err || new Error("Error loading image"))
    }
  }
  return texture
}

Texture2D.prototype.fromArray = function(array) {
  copyNDArray(this, array, 0, false, 0, 0)
}

//Blits a texture at a given mip level
Texture2D.prototype.blit = function(array, x, y, level) {
  copyNDArray(this, array, level|0, true, x|0, y|0)
}


function arrayCopy(gl, array, level, update, x_off, y_off, format, type) {
  if(array.stride[1] === 1 && array.stride[0] === array.shape[1]) {
    //Check if array is packed
    var buf = array.data
    if(array.offset !== 0) {
      buf = array.data.subarray(array.offset)
    }
    if(update) {
      gl.texSubImage2D(gl.TEXTURE_2D, level, x_off, y_off, format, array.shape[0], array.shape[1], format, type, buf)
    } else {
    
    }
  } else {
    var scratch = pool.malloc(ndarray.size(array), ndarray.dtype(array))
      , view = ndarray.ctor(scratch, array.shape, [1, array.shape[0]], 0)
    ops.assign(view, array)
    if(update) {
      gl.texSubImage2D(gl.TEXTURE_2D, level, x_off, y_off, format, array.shape[0], array.shape[1], format, type, scratch)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, level, format, array.shape[0], array.shape[1], 0, format, type, scratch)
    }
    pool.free(scratch)
  }
}

function copyNDArray(texture, array, level, update, x_off, y_off) {
  var gl = texture.context
  texture.bind()
  //Compute format based on shape
  if(array.shape.length === 2) {
    if(array.data instanceof Uint32Array) {
      arrayCopy(gl, array, level, update, x_off, y_off, gl.RGBA, gl.UNSIGNED_BYTE)
    } else if(array.data instanceof Float32Array) {
      if(webglew(gl).OES_texture_float) {
        arrayCopy(gl, array, level, update, x_off, y_off, gl.LUMINANCE, gl.FLOAT)
      } else {
        throw new Error("Floating point texture extension not supported")
      }
    } else if(array.data instanceof Uint8Array) {
      arrayCopy(gl, array, level, update, x_off, y_off, gl.LUMINANCE, gl.UNSIGNED_BYTE)
    } else if(array.data instanceof Uint16Array) {
      arrayCopy(gl, array, level, update, x_off, y_off, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4)
    } else {
      throw new Error("Unsupported texture format")
    }
  } else {
    //Require that array type is compatible
    var type
    if(array.data instanceof Uint8Array) {
      type = gl.UNSIGNED_BYTE
    } else if(array.data instanceof Float32Array) {
      if(webglew(gl).OES_texture_float) {
        type = gl.FLOAT
      } else {
        throw new Error("Floating point texture extension not supported")
      }
    } else {
      throw new Error("Invalid texture type")
    }
    //Retrieve texture format
    var format
    switch(array.shape[2]) {
      case 1:
        format = gl.LUMINANCE
      break
      case 2:
        format = gl.LUMINANCE_ALPHA
      break
      case 3:
        format = gl.RGB
      break
      case 4:
        format = gl.RGBA
      break
      default:
        throw new Error("Invalid array shape")
    }
    //Check stride, copy directly if compatible
    if(array.stride[2] === 1 &&
       array.stride[1] === array.shape[2] &&
       array.stride[0] === array.shape[0] * array.shape[1]) {
      var buf = array.data
      if(array.offset !== 0) {
        buf = array.data.subarray(array.offset, array.offset + ndarray.size(array))
      }
      if(update) {
        gl.texSubImage2D(gl.TEXTURE_2D, level, x_off, y_off, format, array.shape[0], array.shape[1], format, type, buf)
      } else {
        gl.texImage2D(gl.TEXTURE_2D, level, format, array.shape[0], array.shape[1], 0, format, type, buf)
        texture._width = array.shape[1]
        texture._height = array.shape[0]
      }
    } else {
      var scratch = pool.malloc(ndarray.size(array), ndarray.dtype(array))
        , view = ndarray.ctor(scratch, array.shape, [array.shape[1]*array.shape[2], 1], 0)
      ops.assign(view, array)
      if(update) {
        gl.texSubImage2D(gl.TEXTURE_2D, level, x_off, y_off, format, array.shape[0], array.shape[1], format, type, scratch)
      } else {
        gl.texImage2D(gl.TEXTURE_2D, level, format, array.shape[0], array.shape[1], 0, format, type, scratch)
        texture._width = array.shape[1]
        texture._height = array.shape[0]
      }
      pool.free(scratch)
    }
  }
}

function init(gl) {
  var tex = gl.createTexture2D()
  gl.bind(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  return new Texture2D(gl, tex, 0, 0, gl.NEAREST, gl.NEAREST, gl.REPEAT, gl.REPEAT)
}

function createTexture2D(gl) {
  if(arguments.length === 0) {
    throw new Error("Missing arguments")
  }
  if(arguments.length === 1) {
    return init(gl)
  }
  var result = init(gl)
  result.setPixels(
  if( arguments[1] instanceof HTMLCanvasElement ||
      arguments[1] instanceof HTMLImageElement ||
      arguments[1] instanceof HTMLVideoElement ) {
    var result = init(gl)
    result.fromDOM(arguments[1], arguments[2])
    return result
  }
  if(arguments[1] instanceof String) {
    var result = init(gl)
    result.fromURL(arguments[1], arguments[2])
    return result
  }
  if(arguments[1].shape) {
    var result = init(gl)
    result.fromNDarray(arguments[1])
    return result
  }
  throw new Error("Invalid arguments for texture object")
}
module.exports = createTexture2D