"use strict"

var ndarray = require("ndarray")
var ops = require("ndarray-ops")
var pool = require("typedarray-pool")
var webglew = require("webglew")
var cwise = require("cwise")

var convertFloatToUint8 = cwise({
  args: ["array", "array"],
  body: function(out, inp) {
    var x = 255 * inp
    if(x < 0) {
      out = 0
    } else if(x > 255) {
      out = 255
    } else {
      out = x|0
    }
  }
})

function Texture2D(gl, handle, width, height, format, type) {
  this.gl = gl
  this.handle = handle
  this.shape = [ height, width ]
  this.format = format
  this.type = type
  this._mipLevels = [0]
  this._magFilter = gl.NEAREST
  this._minFilter = gl.NEAREST
  this._wrapS = gl.CLAMP_TO_EDGE
  this._wrapT = gl.CLAMP_TO_EDGE
  this._anisoSamples = 1
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

var proto = Texture2D.prototype

Object.defineProperty(proto, "magFilter", {
  get: function() {
    return this._magFilter
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, v)
    return this._magFilter = v
  }
})

Object.defineProperty(proto, "wrapS", {
  get: function() {
    return this._wrapS
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, v)
    return this._wrapS = v
  }
})

Object.defineProperty(proto, "wrapT", {
  get: function() {
    return this._wrapT
  },
  set: function(v) {
    this.bind()
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, v)
    return this._wrapT = v
  }
})

Object.defineProperty(proto, "mipSamples", {
  get: function() {
    return this._anisoSamples
  },
  set: function(i) {
    var psamples = this._anisoSamples
    this._anisoSamples = i|0
    if(psamples !== this._anisoSamples) {
      var ext = webglew(this.gl).EXT_texture_filter_anisotropic
      if(ext) {
        this.gl.texParameterf(this.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this._anisoSamples)
      }
    }
    return this._anisoSamples
  }
})

proto.bind = function bindTexture2D(unit) {
  var gl = this.gl
  if(unit !== undefined) {
    gl.activeTexture(gl.TEXTURE0 + (unit|0))
  }
  gl.bindTexture(gl.TEXTURE_2D, this.handle)
  if(unit !== undefined) {
    return unit
  }
  return gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0
}

proto.dispose = function disposeTexture2D() {
  this.gl.deleteTexture(this.handle)
}

proto.generateMipmap = function() {
  this.bind()
  this.gl.generateMipmap(this.gl.TEXTURE_2D)
  
  //Update mip levels
  var l = Math.min(this.shape[0], this.shape[1])
  for(var i=0; l>0; ++i, l>>>=1) {
    if(this._mipLevels.indexOf(i) < 0) {
      this._mipLevels.push(i)
    }
  }
}

proto.setPixels = function(data, x_off, y_off, mip_level) {
  var gl = this.gl
  this.bind()
  x_off = x_off || 0
  y_off = y_off || 0
  mip_level = mip_level || 0
  if(data instanceof HTMLCanvasElement ||
     data instanceof ImageData ||
     data instanceof HTMLImageElement ||
     data instanceof HTMLVideoElement) {
    var needsMip = this._mipLevels.indexOf(mip_level) < 0
    if(needsMip) {
      gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, data)
      this._mipLevels.push(mip_level)
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, this.format, this.type, data)
    }
  } else if(data.shape && data.stride && data.data) {
    if(data.shape.length < 2 ||
       x_off + data.shape[1] > this.shape[1]>>>mip_level ||
       y_off + data.shape[0] > this.shape[0]>>>mip_level ||
       x_off < 0 ||
       y_off < 0) {
      throw new Error("Texture dimensions are out of bounds")
    }    
    texSubImageArray(gl, x_off, y_off, mip_level, this.format, this.type, this._mipLevels, data)
  } else {
    throw new Error("Unsupported data type")
  }
}

function texSubImageArray(gl, x_off, y_off, mip_level, cformat, ctype, mipLevels, array) {
  var dtype = array.dtype || ndarray.dtype(array)
  var shape = array.shape
  var packed = isPacked(array)
  var type = 0, format = 0
  if(dtype === "float32") {
    type = gl.FLOAT
  } else if(dtype === "float64") {
    type = gl.FLOAT
    packed = false
    dtype = "float32"
  } else if(dtype === "uint8") {
    type = gl.UNSIGNED_BYTE
  } else {
    type = gl.UNSIGNED_BYTE
    packed = false
  }
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
  //For 1-channel textures allow conversion between formats
  if((format  === gl.LUMINANCE || format  === gl.ALPHA) &&
     (cformat === gl.LUMINANCE || cformat === gl.ALPHA)) {
    format = cformat
  }
  if(format !== cformat) {
    throw new Error("Incompatible texture format for setPixels")
  }
  var size = array.size
  if(typeof size !== "number") {
    size = ndarray.size(array)
  }
  var needsMip = mipLevels.indexOf(mip_level) < 0
  if(needsMip) {
    mipLevels.push(mip_level)
  }
  if(type === ctype && packed) {
    //Array data types are compatible, can directly copy into texture
    if(array.offset === 0 && array.data.length === size) {
      if(needsMip) {
        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[1], shape[0], 0, cformat, ctype, array.data)
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[1], shape[0], cformat, ctype, array.data)
      }
    } else {
      if(needsMip) {
        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[1], shape[0], 0, cformat, ctype, array.data.subarray(array.offset, array.offset+size))
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[1], shape[0], cformat, ctype, array.data.subarray(array.offset, array.offset+size))
      }
    }
  } else {
    //Need to do type conversion to pack data into buffer
    var pack_buffer
    if(ctype === gl.FLOAT) {
      pack_buffer = pool.mallocFloat32(size)
    } else {
      pack_buffer = pool.mallocUint8(size)
    }
    var pack_view = ndarray(pack_buffer, shape)
    if(type === gl.FLOAT && ctype === gl.UNSIGNED_BYTE) {
      convertFloatToUint8(pack_view, array)
    } else {
      ops.assign(pack_view, array)
    }
    if(needsMip) {
      gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[1], shape[0], 0, cformat, ctype, pack_buffer.subarray(0, size))
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[1], shape[0], cformat, ctype, pack_buffer.subarray(0, size))
    }
    if(ctype === gl.FLOAT) {
      pool.freeFloat32(pack_buffer)
    } else {
      pool.freeUint8(pack_buffer)
    }
  }
}

function initTexture(gl) {
  var tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
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

function isPacked(array) {
  var shape = array.shape
  var stride = array.stride
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
  var dtype = array.dtype || ndarray.dtype(array)
  var shape = array.shape
  var packed = isPacked(array)
  var type = 0
  if(dtype === "float32") {
    type = gl.FLOAT
  } else if(dtype === "float64") {
    type = gl.FLOAT
    packed = false
    dtype = "float32"
  } else if(dtype === "uint8") {
    type = gl.UNSIGNED_BYTE
  } else {
    type = gl.UNSIGNED_BYTE
    packed = false
  }
  var format = 0
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
  if(type === gl.FLOAT && !!webglew(gl).texture_float) {
    type = gl.UNSIGNED_BYTE
    packed = false
  }
  var buffer, buf_store
  if(!packed) {
    var sz = 1
    var stride = new Array(shape.length)
    for(var i=shape.length-1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
    buf_store = pool.malloc(sz, dtype)
    var buf_array = ndarray(buf_store, array.shape, stride, 0)
    if((dtype === "float32" || dtype === "float64") && type === gl.UNSIGNED_BYTE) {
      convertFloatToUint8(buf_array, array)
    } else {
      ops.assign(buf_array, array)
    }
    buffer = buf_store.subarray(0, sz)
  } else {
    var array_size = array.size
    if(typeof array_size !== "number") {
      array_size = ndarray.size(array)
    }
    buffer = array.data.subarray(array.offset, array.offset + array_size)
  }
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, shape[1], shape[0], 0, format, type, buffer)
  if(!packed) {
    pool.free(buf_store)
  }
  return new Texture2D(gl, tex, shape[1], shape[0], format, type)
}

function createTexture2D(gl) {
  if(arguments.length <= 1) {
    throw new Error("Missing arguments for texture2d constructor")
  }
  if(typeof arguments[1] === "number") {
    return createTextureShape(gl, arguments[1], arguments[2], arguments[3]||gl.RGBA, arguments[4]||gl.UNSIGNED_BYTE)
  }
  if(typeof arguments[1] === "object") {
    var obj = arguments[1]
    if(obj instanceof HTMLCanvasElement ||
       obj instanceof HTMLImageElement ||
       obj instanceof HTMLVideoElement ||
       obj instanceof ImageData) {
      return createTextureDOM(gl, obj, arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
    } else if(obj.shape && obj.data && obj.stride) {
      return createTextureArray(gl, obj)
    }
  }
  throw new Error("Invalid arguments for texture2d constructor")
}
module.exports = createTexture2D
