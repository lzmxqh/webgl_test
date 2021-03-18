/**
 * Lesson5-绘制矩形-索引缓冲区
 * @Author: lzmxqh 
 * @Date: 2021-03-19 00:51:54 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-03-19 01:27:39
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 v3Position;
    void main() {
        gl_Position = vec4(v3Position, 1.0);
    }
`;

/**片段着色器 */ 
var fs = `
    void main() {
        gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var triangleBuffer = null;
var indexBuffer = null;
var v3PositionIndex = 0;

window.onload = function () {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    var webgl = canvas.getContext('webgl');

    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

    vertexShaderObject = webgl.createShader(webgl.VERTEX_SHADER);
    fragmentShaderObject = webgl.createShader(webgl.FRAGMENT_SHADER);

    webgl.shaderSource(vertexShaderObject, vs);
    webgl.shaderSource(fragmentShaderObject, fs);

    webgl.compileShader(vertexShaderObject);
    webgl.compileShader(fragmentShaderObject);

    if (!webgl.getShaderParameter(vertexShaderObject, webgl.COMPILE_STATUS)) {
        alert("error: vertexShaderObject");
        return;
    }
    if (!webgl.getShaderParameter(fragmentShaderObject, webgl.COMPILE_STATUS)) {
        alert("error: fragmentShaderObject");
        return;
    }
    programObject = webgl.createProgram();
    webgl.attachShader(programObject, vertexShaderObject);
    webgl.attachShader(programObject, fragmentShaderObject);

    webgl.bindAttribLocation(programObject, v3PositionIndex, "v3Position");
    webgl.linkProgram(programObject);
    if (!webgl.getProgramParameter(programObject, webgl.LINK_STATUS)) {
        alert("error: programObject");
        return;
    }
    webgl.useProgram(programObject);

    var jsArrayData = [
        -0.5, +0.5, 0.0, 0.0, 0.0, 0.0,
        +0.5, +0.5, 0.0, 0.0, 0.0, 0.0,
        +0.5, -0.5, 0.0, 0.0, 0.0, 0.0,
        -0.5, -0.5, 0.0, 0.0, 0.0, 0.0
    ];

    var indexData = [
        0, 1, 2,
        0, 2, 3
    ];
    
    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(jsArrayData), webgl.STATIC_DRAW); 
    
    indexBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), webgl.STATIC_DRAW);

    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 6, 0);
    
    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);
}