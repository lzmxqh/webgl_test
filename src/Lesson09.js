// import * as glMatrix from "../node_modules/gl-matrix/esm/common.js";
// import * as mat2 from "../node_modules/gl-matrix/esm/mat2.js";
// import * as mat2d from "../node_modules/gl-matrix/esm/mat2d.js";
// import * as mat3 from "../node_modules/gl-matrix/esm/mat3.js";
// import * as mat4 from "../node_modules/gl-matrix/esm/mat4.js";
// import * as quat from "../node_modules/gl-matrix/esm/quat.js";
// import * as quat2 from "../node_modules/gl-matrix/esm/quat2.js";
// import * as vec2 from "../node_modules/gl-matrix/esm/vec2.js";
// import * as vec3 from "../node_modules/gl-matrix/esm/vec3.js";
// import * as vec4 from "../node_modules/gl-matrix/esm/vec4.js";
// export { glMatrix, mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4 };

/**
 * Lesson9-投影矩阵
 * @Author: lzmxqh 
 * @Date: 2021-03-21 00:10:15 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-03-22 00:12:40
 */
/**顶点着色器 */ 
var vs = `
    precision lowp float;
    attribute vec3 v3Position;
    uniform float anim;
    uniform mat4 proj;
    void main() {
        gl_Position = proj * vec4(v3Position.x + anim, v3Position.y, v3Position.z, 1.0);
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
var indexBuffer = null;
var v3PositionIndex = 0;
var uniformColor = 0;
var uniformAnim = 0;
var animTime = 0;
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
    mat4.ortho(projectMat, 0, canvas.clientWidth, 0, canvas.clientHeight, -1.0, 1.0);
        
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
        +0.0, +0.0,     0.0, 1.0, 0.0, 0.0, 1.0,
        +100.0, +0.0,   0.0, 0.0, 1.0, 0.0, 1.0,
        +100.0, +100.0, 0.0, 0.0, 0.0, 1.0, 1.0,
        +0.0, +100.0,   0.0, 1.0, 1.0, 0.0, 1.0
    ];

    var indexData = [
        0, 1, 2,
        0, 2, 3
    ];

    webgl.bindAttribLocation(programObject, v3PositionIndex, "v3Position");
    uniformColor = webgl.getUniformLocation(programObject, "color");
    uniformAnim = webgl.getUniformLocation(programObject, "anim");
    uniformProj = webgl.getUniformLocation(programObject, "proj");

    webgl.uniform4f(uniformColor, 1, 1, 0, 1);
    webgl.uniformMatrix4fv(uniformProj, false, projectMat);

    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(jsArrayData), webgl.STATIC_DRAW); 

    indexBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), webgl.STATIC_DRAW);
}

function onStart() {
    init();
    onTick();
}

function onRender() {
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    animTime += 1;

    webgl.useProgram(programObject);
    {
        webgl.uniform1f(uniformAnim, animTime);

        webgl.enableVertexAttribArray(v3PositionIndex);

        webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 7, 0);

        webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);
    }
    webgl.useProgram(null);
}

function onTick() {
    requestAnimFrame(onTick);
    onRender();
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
})();

window.onload = onStart();