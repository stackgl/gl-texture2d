var createTexture = require("../texture.js")

var canvas = document.createElement("canvas")
canvas.width = 512
canvas.height = 512
var gl = canvas.getContext("experimental-webgl")

var buffer = gl.createBuffer()
gl.bind(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.DYNAMIC_DRAW)


var prog = gl.createProgram()
var f_shader = gl.createShader()



