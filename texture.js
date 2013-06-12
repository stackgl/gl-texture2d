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

function createTextureArray(gl, array) {
  
}

function createTexture2D(gl) {
  if(arguments.length <= 1) {
    throw new Error("Missing arguments")
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
  throw new Error("Invalid constructor arguments")
}
module.exports = createTexture2D
