var shell = require("gl-now")()
var createShader = require("gl-shader")
var createTexture = require("gl-texture2d")

var lena = require("lena")

shell.on("gl-init", function() {
  var gl = shell.gl
  
  var texture = createTexture(gl, lena)
  
  var shader = createShader(gl, "\
    attribute vec2 position;\
    varying vec2 texCoord;\
    void main() {\
      gl_Position = vec4(position, 0, 1);\
      texCoord = 0.5 * (position + 1.0);\
    }", "\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
      gl_FragColor = texture2D(texture, texCoord);\
    }")
  
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     2,  0,
     0,  2
  ]), gl.STATIC_DRAW)
  
  texture.bind(0)
  shader.bind()
  shader.uniforms.texture = 0
  shader.attributes.position.pointer()
  shader.attributes.position.enable()
})

shell.on("gl-render", function() {
  var gl = shell.gl
  gl.drawArrays(gl.TRIANGLES, 0, 3)
})
