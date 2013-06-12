"use strict"

var ndarray = require("ndarray")
var ops = require("ndarray-ops")
var pool = require("typedarray-pool")
var webglew = require("webglew")

function Texture2D(gl, handle, width, height, format, type) {
  this.gl = gl
  this.handle = handle
  this.shape = [ height, width ]
  this.format = format
  this.type = type
  this._magFilter = gl.NEAREST
  this._minFilter = gl.NEAREST
  this._wrapS = gl.REPEAT
  this._wrapT = gl.REPEAT
}

Object.defineProperty(Texture2D.prototype, "minFilter", {
  get: function() {
    return this._minFilter
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, v)
    return this._minFilter = v
  }
})

Object.defineProperty(Texture2D.prototype, "magFilter", {
  get: function() {
    return this._magFilter
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, v)
    return this._magFilter = v
  }
})

Object.defineProperty(Texture2D.prototype, "wrapS", {
  get: function() {
    return this._wrapS
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, v)
    return this._wrapS = v
  }
})

Object.defineProperty(Texture2D.prototype, "wrapT", {
  get: function() {
    return this._wrapT
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, v)
    return this._wrapT = v
  }
})

Texture2D.prototype.bind = function bindTexture2D(unit) {
  var gl = this.gl
  if(unit !== undefined) {
    gl.activeTexture(gl.TEXTURE0 + (unit|0))
  }
  gl.bindTexture(gl.TEXTURE_2D, this.handle)
}

Texture2D.prototype.dispose = function disposeTexture2D() {
  this.gl.deleteTexture(this.handle)
}

Texture2D.prototype.generateMipmap = function() {
  this.bind()
  this.gl.generateMipmap(this.gl.TEXTURE_2D)
}

Texture2D.prototype.setPixels = function(data, x_off, y_off, mip_level) {
}


function initTexture(gl) {
  var tex = gl.createTexture2D()
  gl.bind(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  return tex
}

function createTextureShape(gl, width, height, format, type) {
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null)
  return new Texture2D(gl, tex, width, height, format, type)
}

function createTextureDOM(gl, element, format, type) {
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, element)
  return new Texture2D(gl, tex, element.width|0, element.height|0, format, type)
}

function isPacked(arr) {
  var shape = arr.shape
  var stride = arr.stride
  var s = 1
  for(var i=shape.length-1; i>=0; --i) {
    if(stride[i] !== s) {
      return false
    }
    s *= shape[i]
  }
  return true
}

//Creates a texture from an ndarray
function createTextureArray(gl, array) {
  var dtype = ndarray.dtype(array)
  var shape = array.shape
  var packed = isPacked(arr)
  var type
  var format
  if("uint16" === dtype && shape.length === 2) {
    type = gl.RGBA
    format = gl.UNSIGNED_BYTE
  } else if("uint32" === dtype && shape.length === 2) {
    type = gl.RGBA
    format = gl.UNSIGNED_SHORT_4_4_4_4
  } else {
    if(dtype === "float32") {
      type = gl.FLOAT
    } else if(dtype === "float64") {
      type = gl.FLOAT
      packed = false
      dtype = "float32"
    } else if(dtype === "uint8") {
      type = gl.UNSIGNED_BYTE
    } else {
      throw new Error("Unsupported data type for ndarray texture")
    }
    var format
    if(shape.length === 2) {
      format = gl.LUMINANCE
    } else if(shape.length === 3) {
      if(shape[2] === 1) {
        format = gl.ALPHA
      } else if(shape[2] === 2) {
        format = gl.LUMINANCE_ALPHA
      } else if(shape[2] === 3) {
        format = gl.RGB
      } else if(shape[2] === 4) {
        format = gl.RGBA
      } else {
        throw new Error("Invalid shape for pixel coords")
      }
    } else {
      throw new Error("Invalid shape for texture")
    }
  }
  //Check if floating point textures are supported
  if(type === gl.FLOAT && !!webglew(gl).texture_float) {
    type = gl.UNSIGNED_BYTE
    packed = false
  }
  //If array is not packed, then we need to repack array
  var buffer, buf_store
  if(!packed) {
    var sz = 1
    var stride = new Array(shape.length)
    for(var i=shape.length-1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
    buf_store = pool.malloc(sz, dtype)
    ops.assign(ndarray.ctor(buf_store, array.shape, stride, 0), array)
    buffer = buf_store.subarray(0, sz)
  } else {
    buffer = array.data.subarray(array.offset, array.offset + ndarray.size(array))
  }
  //Now that we are done, we can initialize the texture
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, shape[1], shape[0], 0, format, type, buffer)
  //Release extra buffer storage
  if(!packed) {
    pool.free(buf_store)
  }
  //Done!
  return new Texture2D(gl, tex, shape[1], shape[0], format, dtype)
}

function createTexture2D(gl) {
  if(arguments.length <= 1) {
    throw new Error("Missing arguments for texture2d constructor")
  }
  if(typeof arguments[1] === "number") {
    return createTextureShape(gl, arguments[0], arguments[1], arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
  }
  if(typeof arguments[1] === "object") {
    var obj = arguments[1]
    if(obj instanceof HTMLCanvasElement ||
       obj instanceof HTMLImageElement ||
       obj instanceof HTMLVideoElement ||
       obj instanceof ImageData) {
      return createTextureDOM(gl, obj, arguments[1]||gl.RGBA, arguments[2]||gl.UNSIGNED_BYTE)
    } else if(obj.shape && obj.data && obj.stride) {
      return createTextureArray(gl, obj)
    }
  }
  throw new Error("Invalid arguments for texture2d constructor")
}
module.exports = createTexture2D
