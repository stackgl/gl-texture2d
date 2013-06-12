"use strict"

var ndarray = require("ndarray")
var ops = require("ndarray-ops")
var pool = require("typedarray-pool")
var webglew = require("webglew")

function Texture2D(gl, handle, width, height, format, type, magFilter, minFilter, wrapS, wrapT) {
  this.context = context
  this.handle = handle
  this.shape = [ height, width ]
  this.format = format
  this.type = type
  this._magFilter = magFilter
  this._minFilter = minFilter
  this._wrapS = wrapS
  this._wrapT = wrapT
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
  gl.bindTexture(gl.TEXTURE_2D, this.id)
}

Texture2D.prototype.dispose = function disposeTexture2D() {
  this.context.deleteTexture(this.id)
}

Texture2D.prototype.generateMipmap = function() {
  this.bind()
  this.context.generateMipmap(gl.TEXTURE_2D)
}

Texture2D.prototype.setPixels = function(data, x_off, y_off, mip_level) {
}


function createTexture2D(gl) {
  if(arguments.length === 0) {
    throw new Error("Missing arguments")
  }
}
module.exports = createTexture2D