var shell = require("gl-now")()
var createShader = require("gl-shader")
var createTexture = require("../texture.js")
var drawTriangle = require("a-big-triangle")
var baboon = require("baboon-image")
var glslify = require("glslify")
var ndarray = require("ndarray")

var createShader = glslify({
  vertex:"\
    attribute vec2 position;\
    varying vec2 texCoord;\
    void main() {\
      gl_Position = vec4(position, 0, 1);\
      texCoord = vec2(0.0,1.0)+vec2(0.5,-0.5) * (position + 1.0);\
    }", 
  fragment: "\
    precision highp float;\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
      gl_FragColor = texture2D(texture, texCoord);\
    }",
  inline: true
})

var shader, texture

shell.on("gl-init", function() {
  var gl = shell.gl
  
  //Create shader
  shader = createShader(gl)
  shader.attributes.position.location = 0

  //Create texture
  texture = createTexture(gl, baboon.transpose(1,0))
})

shell.on("gl-render", function() {
  console.log('foo')
  shader.bind()
  shader.uniforms.texture = texture.bind()
  drawTriangle(shell.gl)
})
