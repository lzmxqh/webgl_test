/**
 * Lesson10-线面
 * @Author: lzmxqh 
 * @Date: 2021-03-21 19:05:54 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-03-21 23:53:52
 */
/**顶点着色器 */ 
var vs = `
    precision lowp float;
    attribute vec3 v3Position;
    uniform mat4 proj;
    void main() {
        gl_Position = proj * vec4(v3Position, 1.0);
    }
`;

/**片段着色器 */ 
var fs = `
    precision lowp float;
    uniform vec4 color;
    void main() {
        gl_FragColor = color;
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var triangleBuffer = null;
var v3PositionIndex = 0;
var uniformColor = 0;
var uniformProj = 0;

var mat4 = glMatrix.mat4;
var projectMat = null;

function init() {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    webgl = canvas.getContext('webgl');
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    projectMat = mat4.create();
    mat4.ortho(projectMat, 0, canvas.clientWidth, canvas.clientHeight, 0, -1.0, 1.0);
        
    vertexShaderObject = webgl.createShader(webgl.VERTEX_SHADER);
    fragmentShaderObject = webgl.createShader(webgl.FRAGMENT_SHADER);

    webgl.shaderSource(vertexShaderObject, vs);
    webgl.shaderSource(fragmentShaderObject, fs);

    webgl.compileShader(vertexShaderObject);
    webgl.compileShader(fragmentShaderObject);

    if (!webgl.getShaderParameter(vertexShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(vertexShaderObject);
        alert(err);
        return;
    }
    if (!webgl.getShaderParameter(fragmentShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(fragmentShaderObject);
        alert(err);
        return;
    }
    programObject = webgl.createProgram();
    
    webgl.attachShader(programObject, vertexShaderObject);
    webgl.attachShader(programObject, fragmentShaderObject);

    webgl.linkProgram(programObject);
    if (!webgl.getProgramParameter(programObject, webgl.LINK_STATUS)) {
        var err = webgl.getProgramInfoLog(programObject);
        alert(err);
        return;
    }
    webgl.useProgram(programObject);

    var jsArrayData = [
        10.0, 110.0, 0.0,
        10.0, 10.0, 0.0,
        110.0, 110.0, 0.0,
        110.0, 10.0, 0.0,
        210.0, 110.0, 0.0,
    ];

    var circle = new Float32Array(362 * 3);
    var radius = 100;
    var centerX = 200;
    var centerY = 200;

    circle[0] = centerX;
    circle[1] = centerY;
    circle[2] = 0;
    for (var i = 1; i < 362; i++) {
        circle[i * 3 + 0] = radius * Math.cos(Math.PI / 180 * i) + centerX;
        circle[i * 3 + 1] = radius * Math.sin(Math.PI / 180 * i) + centerY;
        circle[i * 3 + 2] = 0;
    }

    webgl.bindAttribLocation(programObject, v3PositionIndex, "v3Position");
    uniformColor = webgl.getUniformLocation(programObject, "color");
    uniformProj = webgl.getUniformLocation(programObject, "proj");

    webgl.uniform4f(uniformColor, 1, 1, 0, 1);
    webgl.uniformMatrix4fv(uniformProj, false, projectMat);

    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, circle, webgl.STATIC_DRAW); 
}

function onStart() {
    init();
    onRender();
}

function onRender() {
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);

    webgl.useProgram(programObject);
    {
        webgl.enableVertexAttribArray(v3PositionIndex);

        webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 3, 0);

        /**
         * webgl.LINES
         * webgl.LINE_LOOP
         * webgl.LINE_STRIP
         * webgl.TRIANGLES
         * webgl.TRIANGLE_STRIP
         * webgl.TRIANGLE_FAN
         */
        webgl.drawArrays(webgl.TRIANGLE_FAN, 0, 362);
    }
    webgl.useProgram(null);
}

window.onload = onStart();